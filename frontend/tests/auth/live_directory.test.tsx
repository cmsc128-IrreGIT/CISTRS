import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { AuthContext } from "../../src/features/auth/hooks/auth_context";
import LiveDirectory from "../../src/features/directory/live_directory";
const session = {
    account_UUID: "admin",
    emp_UUID: "admin-employee",
    username: "admin",
    roles: ["Administrator"],
    features: ["Personnel", "User Accounts"],
};
const role = { role_UUID: "role-one", role_name: "Inventory Staff" };
const account = {
    account_UUID: "existing",
    username: "saved.user",
    account_status: "Active",
    last_login_at: null,
    employee: { emp_number: "E-1", f_name: "Saved", l_name: "Employee" },
    roles: [role],
};
const employee = {
    emp_UUID: "employee-one",
    emp_number: "E-2",
    f_name: "New",
    l_name: "Employee",
    position: "Mechanic",
    personnel_category: "Maintenance",
    record_status: "Active",
    licenses: [],
};
function mount(
    kind: "users" | "personnel",
    path: string,
    form = false,
    detail = false,
    features = session.features,
) {
    render(
        <MemoryRouter initialEntries={[path]}>
            <AuthContext
                value={{
                    user: { ...session, features },
                    loading: false,
                    error: "",
                    retry: vi.fn(),
                    login: vi.fn(),
                    logout: vi.fn(),
                }}
            >
                <Routes>
                    <Route
                        path={
                            form
                                ? "/users/new"
                                : detail
                                  ? "/personnel/:personnel_id"
                                  : `/${kind}`
                        }
                        element={
                            <LiveDirectory
                                kind={kind}
                                form={form}
                                detail={detail}
                            />
                        }
                    />
                    <Route path="/403" element={<p>Access denied</p>} />
                </Routes>
            </AuthContext>
        </MemoryRouter>,
    );
}
beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
        configurable: true,
        value() {
            this.setAttribute("open", "");
        },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
        configurable: true,
        value() {
            this.removeAttribute("open");
        },
    });
});
afterEach(() => vi.unstubAllGlobals());
it("displays saved accounts and all their roles", async () => {
    vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify([
                    {
                        ...account,
                        roles: [
                            role,
                            {
                                role_UUID: "role-two",
                                role_name: "Mechanic",
                            },
                        ],
                    },
                ]),
            ),
        ),
    );
    mount("users", "/users");
    expect(await screen.findByText("saved.user")).toBeInTheDocument();
    expect(screen.getByText("Inventory Staff, Mechanic")).toBeInTheDocument();
    expect(
        screen.getByRole("link", { name: "Saved Employee" }),
    ).toHaveAttribute("href", "/users/existing");
});
it("displays a saved employee and an honest empty qualifications state", async () => {
    vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(JSON.stringify([employee]))),
    );
    mount("personnel", "/personnel/employee-one", false, true);
    expect(await screen.findByText("Mechanic")).toBeInTheDocument();
    expect(screen.getByText("No qualifications recorded.")).toBeInTheDocument();
});
it("does not fetch records without the corresponding feature access", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    mount("users", "/users", false, false, ["Personnel"]);
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
});
it("creates an account with the selected employee UUID and multiple role UUIDs", async () => {
    const fetcher = vi
        .fn()
        .mockImplementation(async (url: string, init: RequestInit) => {
            const data =
                init?.method === "POST"
                    ? {}
                    : url.endsWith("/roles")
                      ? [role, { role_UUID: "role-two", role_name: "Mechanic" }]
                      : url.endsWith("/employees")
                        ? [employee]
                        : [account];
            return new Response(JSON.stringify(data));
        });
    vi.stubGlobal("fetch", fetcher);
    mount("users", "/users/new", true);
    const person = userEvent.setup();
    await screen.findByRole("dialog");
    await person.selectOptions(screen.getByRole("combobox"), "employee-one");
    await person.type(screen.getByLabelText(/Username/), "new.employee");
    await person.type(
        screen.getByLabelText(/Temporary password/),
        "temporary123",
    );
    await person.click(screen.getByLabelText("Inventory Staff"));
    await person.click(screen.getByLabelText("Mechanic"));
    fireEvent.submit(
        screen.getByRole("button", { name: "Save account" }).closest("form")!,
    );
    await waitFor(() =>
        expect(
            fetcher.mock.calls.some((call) => call[1]?.method === "POST"),
        ).toBe(true),
    );
    const request = fetcher.mock.calls.find(
        (call) => call[1]?.method === "POST",
    )!;
    expect(JSON.parse(request[1].body)).toEqual({
        emp_UUID: "employee-one",
        username: "new.employee",
        password: "temporary123",
        role_UUIDs: ["role-one", "role-two"],
    });
});
