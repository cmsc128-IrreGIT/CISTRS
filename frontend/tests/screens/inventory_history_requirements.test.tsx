import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import InventoryHistoryPage from "../../src/features/inventory/pages/inventory_history_page";
import type { InventoryTransaction } from "../../src/features/inventory/types/inventory_types";
const state = vi.hoisted(() => ({
    history: [] as InventoryTransaction[],
    is_loading: false,
    error: null as string | null,
    reload: vi.fn(),
}));
vi.mock("../../src/features/inventory/hooks/use_inventory_history", () => ({
    default: () => state,
}));
afterEach(() => {
    cleanup();
    state.history = [];
    state.error = null;
    state.is_loading = false;
    vi.clearAllMocks();
});
const record: InventoryTransaction = {
    transaction_UUID: "tx-1",
    transaction_type: "RECEIVE",
    quantity_change: 3,
    updated_by: "employee-1",
    created_at: "2026-10-30T10:00:00Z",
    remarks: "Delivery checked",
    status: {
        status_UUID: "status-1",
        current_quantity: 3,
        part: {
            part_UUID: "part-1",
            part_number: "PN-001",
            part_name: "Test part",
        },
        location: {
            location_UUID: "location-1",
            location_name: "Main store",
            storage_area: null,
        },
    },
    updater: { emp_number: "employee-1", f_name: "Demo", l_name: "Staff" },
};
it("shows available change information and links to the correct inventory item", async () => {
    state.history = [record];
    render(
        <MemoryRouter>
            <InventoryHistoryPage />
        </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Test part" })).toHaveAttribute(
        "href",
        "/inventory/part-1",
    );
    for (const value of [
        "PN-001",
        "RECEIVE",
        "+3",
        "Main store",
        "Demo Staff",
        "Delivery checked",
    ])
        expect(screen.getByRole("cell", { name: value })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(
        screen.getByRole("searchbox", { name: "Search inventory history" }),
        "Missing item",
    );
    expect(
        screen.getByText("No history records match these filters."),
    ).toBeInTheDocument();
});
it("distinguishes empty history from a failed protected request", () => {
    render(
        <MemoryRouter>
            <InventoryHistoryPage />
        </MemoryRouter>,
    );
    expect(screen.getByText("No changes recorded yet")).toBeInTheDocument();
    cleanup();
    state.error = "Authentication required";
    render(
        <MemoryRouter>
            <InventoryHistoryPage />
        </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
        "Authentication required",
    );
    expect(
        screen.queryByText("No changes recorded yet"),
    ).not.toBeInTheDocument();
});
