import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ProfilePage from "../../src/features/account/pages/profile_page";
import { AuthContext } from "../../src/features/auth/hooks/auth_context";
import PersonnelWorkspace from "../../src/features/personnel/pages/personnel_workspace";
import PersonnelPage from "../../src/features/personnel/pages/personnel_page";
import PersonnelDetailsPage from "../../src/features/personnel/pages/personnel_details_page";
import UserAccountsWorkspace from "../../src/features/user_management/pages/user_accounts_workspace";
import UserDetailsPage from "../../src/features/user_management/pages/user_details_page";
import UserFormPage from "../../src/features/user_management/pages/user_form_page";
import UsersPage from "../../src/features/user_management/pages/users_page";

const session = {
    account_UUID: "admin",
    emp_UUID: "admin-employee",
    username: "admin",
    features: ["Personnel", "User Accounts"],
    position: { position_UUID: "admin-position", position_name: "President / CEO" },
};

const account = {
    account_UUID: "existing",
    username: "saved.user",
    account_status: "Active",
    last_login_at: null,
    employee: {
        emp_UUID: "existing-employee", emp_number: "E-1", f_name: "Saved", m_name: "Mario", l_name: "Employee",
        position: { position_UUID: "p1", position_name: "Inventory Officer" },
    },
};

const employee = {
    emp_UUID: "employee-one", emp_number: "E-2", f_name: "New", l_name: "Employee",
    position: { position_UUID: "p2", position_name: "Mechanic" },
    personnel_category: "Maintenance",
    record_status: "Active", licenses: [],
};

function mock_api() {
    let accounts = [account];
    const fetcher = vi.fn(async (url: string, request?: RequestInit) => {
        if (url.endsWith(`/personnel/employees/${session.emp_UUID}`)) return Response.json({
            emp_UUID: session.emp_UUID, emp_number: "E-3", f_name: "Demo", l_name: "Admin", department: "Operations",
            contacts: [{ contact: { contact_type: "Work Email", contact_value: "admin@example.test" } }],
        });
        if (url.endsWith("/personnel/employees")) return Response.json([
            { ...account.employee, m_name: "Mario", record_status: "Active" },
            employee,
            {
                emp_UUID: session.emp_UUID, emp_number: "E-3", f_name: "Demo", l_name: "Admin", department: "Operations",
                contacts: [{ contact: { contact_type: "Work Email", contact_value: "admin@example.test" } }],
            },
            { ...employee, emp_UUID: "inactive", emp_number: "E-4", record_status: "Inactive" },
        ]);
        if (url.endsWith("/users") && request?.method === "POST") {
            const { emp_UUID, username } = JSON.parse(String(request.body));
            accounts = [...accounts, {
                ...account, account_UUID: "created", username,
                employee: {
                    ...account.employee, emp_UUID, emp_number: employee.emp_number,
                    f_name: employee.f_name, l_name: employee.l_name,
                    position: employee.position,
                },
            }];
            return Response.json(accounts.at(-1), { status: 201 });
        }
        if (url.endsWith("/users")) return Response.json(accounts);
        throw new Error("Unexpected endpoint");
    });
    vi.stubGlobal("fetch", fetcher);
    return fetcher;
}

function mount(path: string, features = session.features) {
    render(
        <MemoryRouter initialEntries={[path]}>
            <AuthContext value={{
                user: { ...session, features }, loading: false, error: "",
                retry: vi.fn(), login: vi.fn(), logout: vi.fn(),
            }}>
                <Routes>
                    <Route element={<UserAccountsWorkspace />}>
                        <Route path="/users" element={<UsersPage />}>
                            <Route path="new" element={<UserFormPage />} />
                        </Route>
                        <Route path="/users/:user_id" element={<UserDetailsPage />}>
                            <Route path="edit" element={<UserFormPage />} />
                        </Route>
                    </Route>
                    <Route element={<PersonnelWorkspace />}>
                        <Route path="/personnel" element={<PersonnelPage />} />
                        <Route path="/personnel/:personnel_id" element={<PersonnelDetailsPage />} />
                    </Route>
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/403" element={<p>Access denied</p>} />
                </Routes>
            </AuthContext>
        </MemoryRouter>,
    );
}

beforeEach(() => {
    Object.defineProperties(HTMLDialogElement.prototype, {
        showModal: { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } },
        close: { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } },
    });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("shows live positions, filters accounts, and opens the manage screen", async () => {
    const fetcher = mock_api();
    mount("/users");
    const user = userEvent.setup();
    expect(await screen.findByText("saved.user")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Inventory Officer" })).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox"), "missing");
    expect(screen.getByText("No matching accounts")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear search accounts" }));
    await user.selectOptions(screen.getByLabelText("System role"), "Inventory Officer");
    await user.click(screen.getByRole("link", { name: "Manage Saved Mario Employee" }));
    expect(screen.getByRole("heading", { name: "Manage account" })).toBeInTheDocument();
    expect(screen.getByText("Saved Mario Employee · E-1")).toBeInTheDocument();
    expect(fetcher.mock.calls.every(([url]) => !url.includes("/personnel/employees"))).toBe(true);
});

it("uses the account employee name without Personnel feature access", async () => {
    const fetcher = mock_api();
    mount("/users", ["User Accounts"]);
    expect(await screen.findByText("Saved Mario Employee")).toBeInTheDocument();
    expect(fetcher.mock.calls.every(([url]) => !url.includes("/personnel"))).toBe(true);
});

it("shows backend positions in the personnel list and details", async () => {
    mock_api();
    mount("/personnel");

    const row = await screen.findByRole("row", { name: /New Employee E-2/ });
    expect(within(row).getByRole("cell", { name: "Mechanic" })).toBeInTheDocument();
    await userEvent.click(within(row).getByRole("link", { name: /View/ }));

    expect(await screen.findByRole("heading", { name: "New Employee" })).toBeInTheDocument();
    expect(screen.getByText("Mechanic", { exact: true })).toBeInTheDocument();
});

it("does not fetch accounts without feature access", async () => {
    const fetcher = mock_api();
    mount("/users", ["Personnel"]);
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
});

it("creates a live account with the linked employee and refreshes the directory", async () => {
    const fetcher = mock_api();
    mount("/users/new");
    const user = userEvent.setup();
    const dialog = within(await screen.findByRole("dialog", { name: "Create user account" }));
    const personnel = await dialog.findByLabelText(/Linked personnel/);
    expect(dialog.queryByRole("option", { name: "Saved Mario Employee · E-1" })).not.toBeInTheDocument();
    expect(dialog.queryByRole("option", { name: "New Employee · E-4" })).not.toBeInTheDocument();
    await user.selectOptions(personnel, "employee-one");
    expect(dialog.getByText("Mechanic")).toBeInTheDocument();
    await user.type(dialog.getByLabelText(/Username/), "New.Employee");
    await user.type(dialog.getByLabelText(/Temporary password/), "temporary123");
    await user.click(dialog.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("new.employee")).toBeInTheDocument();
    const request = fetcher.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({
        emp_UUID: "employee-one", username: "new.employee", password: "temporary123",
    });
    expect(fetcher.mock.calls.every(([url]) => !url.endsWith("/roles"))).toBe(true);
});

it("previews permission edits and deactivation without writing to the server", async () => {
    const fetcher = mock_api();
    mount("/users/existing");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("link", { name: "Change permissions" }));
    const edit = within(screen.getByRole("dialog", { name: "Edit account access" }));
    await user.click(edit.getByLabelText("Inventory"));
    await user.click(edit.getByRole("button", { name: "Save preview" }));
    expect(screen.getByText("Preview duties: Inventory")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Deactivate account" }));
    const confirmation = within(screen.getByRole("dialog", { name: "Deactivate Saved Mario Employee?" }));
    await user.click(confirmation.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Deactivate account" }));
    await user.click(confirmation.getByRole("button", { name: "Deactivate account" }));
    expect(screen.getByText("Inactive · Preview")).toBeInTheDocument();
    expect(fetcher.mock.calls.every(([, init]) => !init?.method)).toBe(true);
});

it("uses only the signed-in employee on My Profile", async () => {
    const fetcher = mock_api();
    mount("/profile");
    const user = userEvent.setup();
    expect(await screen.findByRole("heading", { name: "Demo Admin" })).toBeInTheDocument();
    expect(screen.getByText("admin@example.test")).toBeInTheDocument();
    expect(screen.getByText("Operations")).toBeInTheDocument();
    expect(fetcher.mock.calls.some(([url]) => url.endsWith(`/personnel/employees/${session.emp_UUID}`))).toBe(true);
    expect(screen.queryByText("Saved Employee")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Request correction" }));
    const dialog = within(screen.getByRole("dialog", { name: "Request profile correction" }));
    await user.type(dialog.getByLabelText("Correction details"), "Update the work email.");
    await user.click(dialog.getByRole("button", { name: "Copy request" }));
    expect(await dialog.findByText("Request copied. Share it with your administrator.")).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toContain("Update the work email.");
});

it("shows the session profile without calling Personnel when access is absent", async () => {
    const fetcher = mock_api();
    mount("/profile", []);
    expect(screen.getByRole("heading", { name: "Account", level: 3 })).toBeInTheDocument();
    await waitFor(() => expect(fetcher).not.toHaveBeenCalled());
});
