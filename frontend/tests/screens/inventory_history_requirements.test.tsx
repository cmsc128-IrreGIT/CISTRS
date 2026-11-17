import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
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
const dialog_methods = {
    showModal: Object.getOwnPropertyDescriptor(
        HTMLDialogElement.prototype,
        "showModal",
    ),
    close: Object.getOwnPropertyDescriptor(
        HTMLDialogElement.prototype,
        "close",
    ),
};
afterEach(() => {
    cleanup();
    for (const [name, descriptor] of Object.entries(dialog_methods)) {
        if (descriptor)
            Object.defineProperty(
                HTMLDialogElement.prototype,
                name,
                descriptor,
            );
        else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
    }
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
it("opens recorded movement details and links to the correct inventory item", async () => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
        configurable: true,
        value(this: HTMLDialogElement) {
            this.setAttribute("open", "");
        },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
        configurable: true,
        value(this: HTMLDialogElement) {
            this.removeAttribute("open");
        },
    });
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
    expect(
        screen.queryByRole("columnheader", { name: "Reference / recipient" }),
    ).not.toBeInTheDocument();
    expect(
        screen.queryByRole("cell", { name: "tx-1" }),
    ).not.toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(
        screen.getByRole("button", { name: "View movement for Test part" }),
    );
    const details = within(
        screen.getByRole("dialog", { name: "Stock movement details" }),
    );
    for (const value of [
        "PN-001",
        "Received",
        "+3",
        "Main store",
        "Demo Staff",
        "Delivery checked",
    ]) {
        expect(details.getByText(value, { exact: true })).toBeInTheDocument();
    }
    expect(
        details.getByText("Transaction ID", { exact: true }),
    ).toBeInTheDocument();
    expect(details.getByText("tx-1", { exact: true })).toBeInTheDocument();
    await user.click(details.getByRole("button", { name: "Close form" }));
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

it("shows the reference column when the API provides a recipient", () => {
    state.history = [{ ...record, recipient: "Hangar team" }];
    render(
        <MemoryRouter>
            <InventoryHistoryPage />
        </MemoryRouter>,
    );
    expect(
        screen.getByRole("columnheader", { name: "Reference / recipient" }),
    ).toBeInTheDocument();
    expect(
        screen.getByRole("cell", { name: "Hangar team" }),
    ).toBeInTheDocument();
});

it("shares the row-size and range controls with the Inventory list", async () => {
    state.history = Array.from({ length: 12 }, (_, index) => ({
        ...record,
        transaction_UUID: `movement-${index}`,
    }));
    render(
        <MemoryRouter>
            <InventoryHistoryPage />
        </MemoryRouter>,
    );
    const user = userEvent.setup();
    expect(screen.getByRole("status")).toHaveTextContent(
        "Showing 1–10 of 12 movements",
    );
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByRole("status")).toHaveTextContent(
        "Showing 11–12 of 12 movements",
    );
    await user.selectOptions(
        screen.getByRole("combobox", { name: "Rows per page" }),
        "5",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
        "Showing 1–5 of 12 movements",
    );
    expect(
        screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
});

it("uses movement pills and colors signed quantities separately from units", () => {
    const part = { ...record.status.part, unit_of_measure: "pcs" };
    state.history = [
        {
            ...record,
            transaction_type: "ISSUE",
            quantity_change: -2,
            status: { ...record.status, part },
        },
        {
            ...record,
            transaction_UUID: "tx-2",
            transaction_type: "ADJUSTMENT",
            status: { ...record.status, part },
        },
    ];
    render(
        <MemoryRouter>
            <InventoryHistoryPage />
        </MemoryRouter>,
    );
    expect(screen.getByText("Issued", { selector: "span" })).toHaveClass(
        "bg-amber-100",
    );
    expect(screen.getByText("Adjusted", { selector: "span" })).toHaveClass(
        "bg-blue-100",
    );
    expect(screen.getByText("-2")).toHaveClass("text-red-700");
    expect(screen.getByText("+3")).toHaveClass("text-emerald-800");
    expect(screen.getAllByText("pcs")).toHaveLength(2);
});
