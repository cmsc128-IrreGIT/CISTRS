import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuthContext } from "../../src/features/auth/hooks/auth_context";
import AvailabilityPage from "../../src/features/personnel/pages/availability_page";
import PersonnelDetailsPage from "../../src/features/personnel/pages/personnel_details_page";
import PersonnelDocumentsPage from "../../src/features/personnel/pages/personnel_documents_page";
import ToastProvider from "../../src/shared/components/feedback/toast_provider";
import PersonnelFormPage from "../../src/features/personnel/pages/personnel_form_page";
import PersonnelPage from "../../src/features/personnel/pages/personnel_page";
import PersonnelWorkspace from "../../src/features/personnel/pages/personnel_workspace";

const employees = [
    {
        emp_UUID: "pilot-1",
        emp_number: "EMP-01",
        f_name: "Demo",
        l_name: "Pilot",
        position_UUID: "83000000-0000-4000-8000-000000000007",
        department: "Pilot",
        employment_status: { status_name: "Active" },
        licenses: [
            {
                emp_license_UUID: "license-1",
                license_number: "P-100",
                license_type: { license_type_name: "Pilot license" },
                date_issued: "2025-12-01T00:00:00.000Z",
                renewal_status_UUID: "42000000-0000-4000-8000-000000000001",
            },
        ],
    },
    {
        emp_UUID: "tech-1",
        emp_number: "EMP-02",
        f_name: "Demo",
        l_name: "Technician",
        position: { position_name: "Technician" },
        position_UUID: "83000000-0000-4000-8000-000000000003",
        department: "Aircraft Maintenance Technician",
        employment_status: { status_name: "Active" },
        contacts: [
            {
                contact: {
                    contact_type: "Email",
                    contact_value: "technician@example.test",
                },
            },
        ],
    },
];

function mount(
    path: string,
    account: string,
    role = "Administrator",
    features = ["Personnel"],
) {
    const fetch_employees = vi.fn(async () => Response.json(employees));
    vi.stubGlobal("fetch", fetch_employees);
    const session = {
        user: {
            account_UUID: account,
            emp_UUID: "staff-1",
            username: "demo",
            roles: [role],
            features,
            position: {
                position_UUID: `position-${role.toLowerCase()}`,
                position_name: role,
            },
        },
        loading: false,
        error: "",
        retry: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
    };
    render(
        <MemoryRouter initialEntries={[path]}>
            <AuthContext value={session}>
                <ToastProvider />
                <Routes>
                    <Route element={<PersonnelWorkspace />}>
                        <Route path="/personnel" element={<PersonnelPage />}>
                            <Route path="new" element={<PersonnelFormPage />} />
                        </Route>
                        <Route
                            path="/personnel/:personnel_id"
                            element={<PersonnelDetailsPage />}
                        >
                            <Route
                                path="edit"
                                element={<PersonnelFormPage />}
                            />
                        </Route>
                        <Route
                            path="/personnel/:personnel_id/documents"
                            element={<PersonnelDocumentsPage />}
                        />
                    </Route>
                    <Route
                        path="/personnel/availability"
                        element={<AvailabilityPage />}
                    />
                    <Route path="/403" element={<p>Access denied</p>} />
                </Routes>
            </AuthContext>
        </MemoryRouter>,
    );
    return fetch_employees;
}

beforeEach(() => {
    Object.defineProperties(HTMLDialogElement.prototype, {
        showModal: {
            configurable: true,
            value(this: HTMLDialogElement) {
                this.setAttribute("open", "");
            },
        },
        close: {
            configurable: true,
            value(this: HTMLDialogElement) {
                this.removeAttribute("open");
            },
        },
    });
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

it("filters live staff and shows pilot-only Flight Hours to a read-only viewer", async () => {
    mount("/personnel", "viewer", "Pilot");
    const user = userEvent.setup();
    await screen.findByRole("link", { name: "View Demo Pilot" });
    expect(
        screen.queryByRole("link", { name: "Add personnel" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Captain" })).toBeInTheDocument();
    expect(
        within(screen.getByLabelText("Department")).queryByRole("option", {
            name: "Flight Operations",
        }),
    ).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Department"), "Pilot");
    expect(
        screen.queryByRole("link", { name: "View Demo Technician" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "View Demo Pilot" }));
    expect(
        screen.queryByRole("link", { name: "Edit personnel" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Licenses" }));
    expect(screen.getByText("P-100")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Flight Hours" }));
    expect(
        screen.getByText("No monthly flight hours available"),
    ).toBeInTheDocument();
});

it("shows staff availability in the read-only directory without an Action column", async () => {
    const fetch_employees = mount(
        "/personnel",
        "inventory-staff",
        "Inventory Officer",
        ["Inventory"],
    );
    const table = within(
        await screen.findByRole("table", { name: "Personnel directory" }),
    );
    expect(fetch_employees).toHaveBeenCalledWith(
        expect.stringContaining("/personnel/directory"),
        expect.anything(),
    );
    expect(fetch_employees).not.toHaveBeenCalledWith(
        expect.stringContaining("/personnel/employees"),
        expect.anything(),
    );
    expect(
        table.getByRole("columnheader", { name: "Availability" }),
    ).toBeInTheDocument();
    expect(table.getByRole("row", { name: /Demo Pilot/ })).toHaveTextContent(
        "Not recorded",
    );
    expect(
        table.queryByRole("columnheader", { name: "Action" }),
    ).not.toBeInTheDocument();
    expect(
        table.queryByRole("link", { name: /View Demo/ }),
    ).not.toBeInTheDocument();
    expect(
        screen.queryByRole("link", { name: "Add personnel" }),
    ).not.toBeInTheDocument();
    expect(
        screen.queryByRole("link", { name: "Availability" }),
    ).not.toBeInTheDocument();
});

it("loads real staff records for Availability-only recorders", async () => {
    const fetch_employees = mount(
        "/personnel/availability",
        "availability-recorder",
        "Records Staff",
        ["Availability"],
    );
    const register = within(
        await screen.findByRole("table", { name: "Personnel availability" }),
    );
    expect(
        register.getByRole("row", { name: /Demo Pilot/ }),
    ).toBeInTheDocument();
    expect(
        register.getByRole("row", { name: /Demo Technician/ }),
    ).toBeInTheDocument();
    expect(fetch_employees).toHaveBeenCalledWith(
        expect.stringContaining("/personnel/directory"),
        expect.anything(),
    );
    expect(fetch_employees).not.toHaveBeenCalledWith(
        expect.stringContaining("/personnel/employees"),
        expect.anything(),
    );
    expect(
        screen.getByRole("button", { name: "Record availability" }),
    ).toBeEnabled();
    expect(screen.getByRole("link", { name: "Directory" })).toHaveAttribute(
        "href",
        "/personnel",
    );
});

it("redirects staff without Availability permission from the recording tab", async () => {
    mount(
        "/personnel/availability",
        "inventory-availability-direct",
        "Inventory Officer",
        ["Inventory"],
    );
    // The recording page is closed, while the directory remains available.
    expect(
        screen.queryByRole("button", { name: "Record availability" }),
    ).not.toBeInTheDocument();
    expect(
        await screen.findByRole("table", { name: "Personnel directory" }),
    ).toBeInTheDocument();
});

it("rejects private Personnel URLs for staff with directory-only access", async () => {
    mount(
        "/personnel/pilot-1/documents",
        "inventory-direct",
        "Inventory Officer",
        ["Inventory"],
    );
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
});

it("blocks direct edit routes for read-only personnel viewers", async () => {
    mount("/personnel/tech-1/edit", "viewer-direct", "Mechanic");
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("adds and edits previews over the correct background without writing to the API", async () => {
    const fetch_employees = mount("/personnel", "admin-preview");
    const user = userEvent.setup();
    await screen.findByRole("link", { name: "Add personnel" });
    await user.click(
        screen.getByRole("link", { name: "View Demo Technician" }),
    );
    expect(
        screen.queryByRole("link", { name: "Flight Hours" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Edit personnel" }));
    const edit = within(
        screen.getByRole("dialog", { name: "Edit personnel record" }),
    );
    expect(edit.getByLabelText(/Full name/)).toHaveValue("Demo Technician");
    const department = edit.getByRole("combobox", { name: /Department/ });
    expect(department).toHaveValue("Aircraft Maintenance Technician");
    expect(
        within(department).getAllByRole("option", {
            name: "Aircraft Maintenance Technician",
        }),
    ).toHaveLength(1);
    expect(
        within(department).queryByRole("option", { name: "Maintenance" }),
    ).not.toBeInTheDocument();
    expect(edit.getByRole("combobox", { name: /Position/ })).toHaveValue(
        "Technician",
    );
    expect(edit.getByLabelText("Work email")).toHaveValue(
        "technician@example.test",
    );
    await user.clear(edit.getByLabelText(/Full name/));
    await user.type(edit.getByLabelText(/Full name/), "Updated Technician");
    await user.click(edit.getByRole("button", { name: "Save personnel" }));
    expect(
        screen.getByRole("heading", { name: "Updated Technician" }),
    ).toBeInTheDocument();

    await user.click(
        within(
            screen.getByRole("navigation", { name: "Breadcrumb" }),
        ).getByRole("link", { name: "Personnel" }),
    );
    await user.click(screen.getByRole("link", { name: "Add personnel" }));
    const add = within(
        screen.getByRole("dialog", { name: "Add personnel record" }),
    );
    await user.click(add.getByRole("button", { name: "Save personnel" }));
    expect(add.getByText("Enter the full name.")).toBeInTheDocument();
    await user.type(add.getByLabelText(/Full name/), "New Staff");
    await user.type(add.getByLabelText(/Employee ID/), "emp-02");
    await user.selectOptions(
        add.getByLabelText(/Position/),
        "Chief Aircraft Mechanic",
    );
    await user.selectOptions(
        add.getByLabelText(/Department/),
        "Aircraft Maintenance Technician",
    );
    await user.selectOptions(add.getByLabelText(/Employment status/), "Active");
    await user.click(add.getByRole("button", { name: "Save personnel" }));
    expect(
        add.getByText("This employee ID is already in use."),
    ).toBeInTheDocument();
    await user.clear(add.getByLabelText(/Employee ID/));
    await user.type(add.getByLabelText(/Employee ID/), "EMP-03");
    await user.click(add.getByRole("button", { name: "Save personnel" }));
    expect(
        screen.getByRole("heading", { name: "New Staff" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetch_employees).toHaveBeenCalledTimes(1);
    expect(fetch_employees).toHaveBeenCalledWith(
        expect.stringContaining("/personnel/employees"),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
});

it("shows a saved availability record on the matching live personnel profile", async () => {
    mount("/personnel/availability", "availability-admin", "Administrator", [
        "Personnel",
        "Availability",
    ]);
    const user = userEvent.setup();
    const register = within(
        await screen.findByRole("table", { name: "Personnel availability" }),
    );
    expect(
        within(register.getByRole("row", { name: /Demo Pilot/ })).getByText(
            "Not recorded",
        ),
    ).toBeInTheDocument();
    await user.click(
        screen.getByRole("button", { name: "Record availability" }),
    );
    const dialog = within(
        screen.getByRole("dialog", { name: "Record availability" }),
    );
    await user.selectOptions(
        dialog.getByRole("combobox", { name: /Personnel/ }),
        "pilot-1",
    );
    await user.selectOptions(
        dialog.getByRole("combobox", { name: /Availability/ }),
        "Unavailable",
    );
    await user.click(dialog.getByRole("button", { name: "Save availability" }));
    expect(
        within(register.getByRole("row", { name: /Demo Pilot/ })).getByText(
            "Unavailable",
        ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Directory" }));
    await user.click(
        await screen.findByRole("link", { name: "View Demo Pilot" }),
    );
    expect(screen.getByText("Last recorded availability")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
});

it("filters personnel documents and shows the browser-session save and dismissal states", async () => {
    const fetch_employees = mount("/personnel/pilot-1", "documents-admin");
    const user = userEvent.setup();
    const create_file_url = vi.fn(() => "blob:credentials");
    const revoke_file_url = vi.fn();
    vi.stubGlobal(
        "URL",
        class extends URL {
            static createObjectURL = create_file_url;
            static revokeObjectURL = revoke_file_url;
        },
    );

    await user.click(await screen.findByRole("link", { name: "Documents" }));
    expect(screen.getByText("Pilot license")).toBeInTheDocument();
    expect(screen.getByText("No file")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Training" }));
    expect(screen.queryByText("Pilot license")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add document" }));
    const dialog = within(
        screen.getByRole("dialog", { name: "Add personnel document" }),
    );
    expect(dialog.getByLabelText(/Document type/)).toHaveValue("Training");
    await user.type(
        dialog.getByLabelText(/Document name/),
        "Safety training certificate",
    );
    await user.type(dialog.getByLabelText("Issue date"), "2090-06-15");
    await user.type(dialog.getByLabelText("Expiry date"), "2090-06-01");
    await user.click(dialog.getByRole("button", { name: "Save" }));
    expect(
        dialog.getByText("Expiry date must be on or after the issue date."),
    ).toBeInTheDocument();

    await user.clear(dialog.getByLabelText("Expiry date"));
    await user.type(dialog.getByLabelText("Expiry date"), "2091-06-15");
    const file = new File(["certificate"], "training.pdf", {
        type: "application/pdf",
    });
    await user.upload(dialog.getByLabelText("Credential file"), file);
    await user.click(dialog.getByRole("button", { name: "Save" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByText("Document saved")).toBeInTheDocument();
    expect(
        screen.getByRole("link", {
            name: "View file for Safety training certificate",
        }),
    ).toHaveAttribute("href", "blob:credentials");
    expect(create_file_url).toHaveBeenCalledWith(file);
    expect(screen.getByText("Valid")).toBeInTheDocument();

    const notification = screen.getByText("Document saved").closest("li")!;
    fireEvent.click(
        within(notification).getByRole("button", { name: "Close toast" }),
    );
    await waitFor(() =>
        expect(screen.queryByText("Document saved")).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole("link", { name: "Licenses" }));
    expect(revoke_file_url).toHaveBeenCalledWith("blob:credentials");
    expect(
        screen.queryByText("Safety training certificate"),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "All documents" }));
    expect(screen.getByText("Safety training certificate")).toBeInTheDocument();
    expect(fetch_employees).toHaveBeenCalledTimes(1);
});

it("keeps documents read-only for viewers without management access", async () => {
    mount("/personnel/pilot-1/documents", "documents-viewer", "Pilot");
    expect(await screen.findByText("Pilot license")).toBeInTheDocument();
    expect(
        screen.queryByRole("button", { name: "Add document" }),
    ).not.toBeInTheDocument();
});
