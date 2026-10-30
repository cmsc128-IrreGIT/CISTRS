import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import InventoryPage from "../../src/features/inventory/pages/inventory_page";
vi.mock("../../src/features/inventory/hooks/use_inventory", () => ({
    default: () => ({
        items: Array.from({ length: 12 }, (_, i) => ({
            part_UUID: `part-${i}`,
            part_name: `Part ${String(i + 1).padStart(2, "0")}`,
            part_number: `PN-${i}`,
            unit_of_measure: "units",
            min_stock_level: 1,
            description: null,
            total_quantity: 10,
            is_low_stock: false,
            locations: [],
            suppliers: [],
            manufacturers: [],
        })),
        is_loading: false,
        error: null,
        reload: vi.fn(),
    }),
}));
vi.mock(
    "../../src/features/inventory/hooks/use_inventory_decommission",
    () => ({
        default: () => ({
            decommission_item: vi.fn(),
            is_decommissioned: () => false,
        }),
    }),
);
afterEach(cleanup);
it("shows five rows by default, preserves pagination and resets when the page size changes", async () => {
    const user = userEvent.setup();
    render(
        <MemoryRouter>
            <InventoryPage />
        </MemoryRouter>,
    );
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(6);
    expect(screen.getByRole("status")).toHaveTextContent(
        "Showing 1–5 of 12 items",
    );
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByRole("status")).toHaveTextContent(
        "Showing 6–10 of 12 items",
    );
    await user.selectOptions(
        screen.getByRole("combobox", { name: "Rows per page" }),
        "10",
    );
    expect(within(table).getAllByRole("row")).toHaveLength(11);
    expect(screen.getByRole("status")).toHaveTextContent(
        "Showing 1–10 of 12 items",
    );
});
