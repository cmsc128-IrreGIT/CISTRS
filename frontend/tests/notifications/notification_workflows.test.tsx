import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import AppRoutes from "../../src/app/app_routes";
import { AuthContext } from "../../src/features/auth/hooks/auth_context";
import InventoryHistoryPage from "../../src/features/inventory/pages/inventory_history_page";
import InventoryPage from "../../src/features/inventory/pages/inventory_page";
import PersonnelPage from "../../src/features/personnel/pages/personnel_page";
import PersonnelWorkspace from "../../src/features/personnel/pages/personnel_workspace";
import MaintenancePage from "../../src/features/maintenance/pages/maintenance_page";
import NotificationPreferencesPage from "../../src/features/notifications/pages/notification_preferences_page";
import NotificationsPage from "../../src/features/notifications/pages/notifications_page";
import ToastProvider from "../../src/shared/components/feedback/toast_provider";

function mount(account: string, features = ["Inventory", "Maintenance", "Personnel"]) {
    return render(
        <MemoryRouter initialEntries={["/notifications"]}>
            <AuthContext value={{
                user: { account_UUID: account, emp_UUID: "person", username: account, features },
                loading: false, error: "", retry: vi.fn(), login: vi.fn(), logout: vi.fn(),
            }}>
                <ToastProvider />
                <Routes>
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/maintenance" element={<MaintenancePage />} />
                    <Route path="/inventory" element={<InventoryPage />} />
                    <Route path="/inventory/history" element={<InventoryHistoryPage />} />
                    <Route element={<PersonnelWorkspace />}>
                        <Route path="/personnel" element={<PersonnelPage />} />
                    </Route>
                    <Route path="/notifications/preferences" element={<NotificationPreferencesPage />} />
                </Routes>
            </AuthContext>
        </MemoryRouter>,
    );
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("filters the inbox and updates individual and bulk read states", async () => {
    mount("inbox-preview");
    const user = userEvent.setup();
    expect(screen.getByRole("button", { name: "All (4)" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "Stock review: Brake Pad Set" })).toHaveAttribute("href", "/inventory#record=BRK-001");
    expect(screen.getByRole("link", { name: "License expiry reminder" })).toHaveAttribute("href", "/personnel#record=SA-0004");
    expect(screen.getByRole("link", { name: "Stock adjustment" })).toHaveAttribute("href", "/inventory/history#record=b72e4d13-8a56-4c21-a735-6e9b02d4f817");
    const filter = screen.getByRole("combobox", { name: "Filter by feature" });

    await user.selectOptions(filter, "inventory");
    expect(screen.queryByText("Maintenance reminder")).not.toBeInTheDocument();
    expect(screen.getByText("Stock adjustment")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Unread (1)" }));
    expect(screen.queryByText("Stock adjustment")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mark as read: Stock review: Brake Pad Set" }));
    expect(screen.getByRole("heading", { name: "No matching notifications" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "All (2)" }));
    await user.click(screen.getByRole("button", { name: "Mark as unread: Stock review: Brake Pad Set" }));
    expect(screen.getByRole("button", { name: "Unread (1)" })).toBeInTheDocument();

    await user.selectOptions(filter, "all");
    await user.click(screen.getByRole("button", { name: "Unread (3)" }));
    await user.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(screen.getByRole("heading", { name: "All caught up" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark all as read" })).toBeDisabled();
});

it("validates delivery contacts and keeps saved switch choices after leaving the page", async () => {
    mount("preferences-preview");
    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: "Notification preferences" }));

    const email_stock = "Email for Low stock & stock updates";
    const email_expiry = "Email for License & certificate expiry";
    await user.click(screen.getByRole("switch", { name: email_stock }));
    expect(screen.getByRole("switch", { name: email_expiry })).toHaveAttribute("aria-checked", "false");
    await user.click(screen.getByRole("button", { name: "Save preferences" }));
    expect(screen.getByText("Enter a valid work email.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Work email"), "staff@example.test");
    await user.click(screen.getByRole("button", { name: "Save preferences" }));
    expect(screen.getByRole("heading", { name: "Current preferences" })).toBeInTheDocument();
    expect(screen.getByText("Enabled for some alerts")).toBeInTheDocument();
    expect(screen.getByText("Off · mobile number not added")).toBeInTheDocument();
    const notification = (await screen.findByText("Notification preferences updated")).closest("li")!;
    fireEvent.click(within(notification).getByRole("button", { name: "Close toast" }));
    await waitFor(() => expect(screen.queryByText("Notification preferences updated")).not.toBeInTheDocument());

    await user.click(screen.getByRole("link", { name: "Notifications", exact: true }));
    await user.click(screen.getByRole("link", { name: "Notification preferences" }));
    await user.click(screen.getByRole("button", { name: "Edit preferences" }));
    expect(screen.getByRole("switch", { name: email_stock })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: email_expiry })).toHaveAttribute("aria-checked", "false");
});

it("opens and briefly highlights the matching maintenance record", async () => {
    mount("highlight-preview");
    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: "Maintenance reminder" }));

    expect(await screen.findByRole("heading", { name: "Maintenance tasks" })).toBeInTheDocument();
    const row = screen.getByRole("row", { name: /Routine inspection/ });
    await waitFor(() => expect(row).toHaveClass("record-highlight"));
    expect(screen.queryByRole("heading", { name: "Record information" })).not.toBeInTheDocument();
    await waitFor(() => expect(row).not.toHaveClass("record-highlight"), { timeout: 5000 });
}, 6500);

const brake_pad = {
    part_UUID: "current-brake-id", part_number: "BRK-001", part_name: "Brake Pad Set", total_quantity: 8,
    min_stock_level: 4, unit_of_measure: "set", locations: [], suppliers: [], manufacturers: [],
};

function mock_destination_records(transactions_available = true) {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
        if (url.endsWith("/inventory/parts")) return Response.json([brake_pad]);
        if (url.endsWith("/personnel/employees")) return Response.json([{
            emp_UUID: "current-employee-id", emp_number: "SA-0004", f_name: "Sample", l_name: "Pilot",
        }]);
        if (url.endsWith("/inventory/transactions")) return Response.json(transactions_available ? [{
            transaction_UUID: "b72e4d13-8a56-4c21-a735-6e9b02d4f817", transaction_type: "ADJUSTMENT",
            quantity_change: 5, created_at: "2026-10-01T08:00:00Z", remarks: "Opening balance at system setup",
            status: { part: brake_pad, location: { location_name: "Main Store" } },
            updater: { f_name: "Demo", l_name: "Staff" },
        }] : []);
        throw new Error(`Unexpected endpoint: ${url}`);
    }));
}

it.each([
    ["Stock review: Brake Pad Set", /Brake Pad Set/],
    ["License expiry reminder", /Sample Pilot/],
    ["Stock adjustment", /Brake Pad Set/],
])("highlights the matching server-loaded row from %s", async (alert, row_name) => {
    mock_destination_records();
    mount("loaded-highlight-preview");
    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: alert }));
    const row = await screen.findByRole("row", { name: row_name });
    await waitFor(() => expect(row).toHaveClass("record-highlight"));
});

it("explains when the linked transaction is outside the available history", async () => {
    mock_destination_records(false);
    mount("missing-highlight-preview");
    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: "Stock adjustment" }));
    expect(await screen.findByText("The linked transaction is unavailable in recent Stock History.")).toBeInTheDocument();
});

it("shows only preview alerts for the signed-in account's features", () => {
    mount("personnel-only-preview", ["Personnel", "Notifications"]);
    expect(screen.getByRole("link", { name: "License expiry reminder" })).toBeInTheDocument();
    expect(screen.queryByText("Maintenance reminder")).not.toBeInTheDocument();
    expect(screen.queryByText("Stock adjustment")).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Inventory" })).not.toBeInTheDocument();
});

it.each(["/aircraft", "/maintenance", "/logbook/new"])("denies direct access to %s without the required feature", (path) => {
    render(
        <MemoryRouter initialEntries={[path]}>
            <AuthContext value={{
                user: { account_UUID: "limited", emp_UUID: "person", username: "limited", features: ["Inventory"] },
                loading: false, error: "", retry: vi.fn(), login: vi.fn(), logout: vi.fn(),
            }}>
                <AppRoutes />
            </AuthContext>
        </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Access restricted" })).toBeInTheDocument();
});
