import {
    cleanup,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { InventoryTabs } from "../../src/features/inventory/components/inventory_workspace";
import InventoryPage from "../../src/features/inventory/pages/inventory_page";
const fixture = vi.hoisted(() => ({
    category: undefined as string | undefined,
}));

vi.mock("../../src/features/inventory/hooks/use_inventory", () => ({
    default: () => ({
        items: Array.from({ length: 12 }, (_, i) => ({
            part_UUID: `part-${i}`,
            part_name: `Part ${String(i + 1).padStart(2, "0")}`,
            part_number: `PN-${i}`,
            unit_of_measure: "units",
            min_stock_level: 1,
            description: null,
            total_quantity: i === 0 ? 1 : i === 1 ? 0 : 10,
            is_low_stock: i === 0,
            category: i === 0 ? fixture.category : undefined,
            expiry_date: i === 1 ? null : i === 2 ? "2027-02-08" : undefined,
            locations:
                i === 0
                    ? [
                          {
                              status_UUID: "cebu-1",
                              location_UUID: "cebu",
                              location_name: "Cebu Main Store",
                              storage_area: "Warehouse A",
                              current_quantity: 1,
                          },
                          {
                              status_UUID: "manila-1",
                              location_UUID: "manila",
                              location_name: "Manila Store",
                              storage_area: "Warehouse B",
                              current_quantity: 0,
                          },
                      ]
                    : [],
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
afterEach(() => {
    cleanup();
    fixture.category = undefined;
});
it("shows five rows by default, preserves pagination and resets when the page size changes", async () => {
    const user = userEvent.setup();
    render(
        <MemoryRouter>
            <InventoryPage />
        </MemoryRouter>,
    );
    expect(
        screen.queryByRole("combobox", { name: "Sort by" }),
    ).not.toBeInTheDocument();
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

it("uses a dash placeholder only when the expiry date is missing", () => {
    render(
        <MemoryRouter>
            <InventoryPage />
        </MemoryRouter>,
    );
    const table = screen.getByRole("table");
    const cell = (part: string, expiry: string) =>
        within(
            within(table).getByRole("row", { name: new RegExp(part) }),
        ).getByRole("cell", {
            name: expiry,
        });

    expect(cell("Part 01", "--")).toBeInTheDocument();
    expect(cell("Part 02", "Not applicable")).toBeInTheDocument();
    expect(cell("Part 03", "8 Feb 2027")).toBeInTheDocument();
});

it("filters low and out-of-stock items and recovers after an unmatched search", async () => {
    const user = userEvent.setup();
    render(
        <MemoryRouter initialEntries={["/inventory?stock=alerts"]}>
            <InventoryPage />
        </MemoryRouter>,
    );
    expect(screen.getByRole("combobox", { name: "Stock status" })).toHaveValue(
        "alerts",
    );
    expect(screen.getByRole("cell", { name: "Low stock" })).toBeInTheDocument();
    expect(
        screen.getByRole("cell", { name: "Out of stock" }),
    ).toBeInTheDocument();
    expect(
        screen.queryByRole("cell", { name: "In stock" }),
    ).not.toBeInTheDocument();

    await user.type(
        screen.getByRole("searchbox", { name: "Search inventory" }),
        "no such part",
    );
    expect(
        screen.getByRole("heading", { name: "No matching items" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("status")).toHaveTextContent(
        "Showing 1–5 of 12 items",
    );
});

it("shows all locations and only shows the Category controls when data exists", async () => {
    const user = userEvent.setup();
    const show = () =>
        render(
            <MemoryRouter>
                <InventoryPage />
            </MemoryRouter>,
        );
    show();
    expect(
        screen.queryByRole("columnheader", { name: "Category" }),
    ).not.toBeInTheDocument();
    expect(
        screen.queryByRole("combobox", { name: "Category" }),
    ).not.toBeInTheDocument();
    const table = within(screen.getByRole("table"));
    expect(table.getByText("Cebu Main Store")).toBeVisible();
    expect(table.getByText("Manila Store")).toBeVisible();
    expect(table.getByText(/Warehouse B/)).toBeVisible();
    expect(table.queryByText("+1 more")).not.toBeInTheDocument();

    cleanup();
    fixture.category = "  Consumables  ";
    show();
    expect(
        screen.getByRole("columnheader", { name: "Category" }),
    ).toBeInTheDocument();
    await user.selectOptions(
        screen.getByRole("combobox", { name: "Category" }),
        "Consumables",
    );
    expect(
        screen.getByRole("cell", { name: "Consumables" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 item");
});

it("opens the inventory page containing the notification target and highlights the matching row", async () => {
    const user = userEvent.setup();
    render(
        <MemoryRouter
            initialEntries={[
                {
                    pathname: "/inventory",
                    state: { highlight_record: "part-10" },
                },
            ]}
        >
            <InventoryPage />
        </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
        "Showing 11–12 of 12 items",
    );
    await waitFor(() =>
        expect(screen.getByRole("row", { name: /Part 11/ })).toHaveClass(
            "record-highlight",
        ),
    );
    expect(screen.getByRole("row", { name: /Part 12/ })).not.toHaveClass(
        "record-highlight",
    );
    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(screen.getByRole("status")).toHaveTextContent(
        "Showing 6–10 of 12 items",
    );
});

it("scrolls the active inventory tab into view on a narrow strip", () => {
    const bounds = vi
        .spyOn(HTMLElement.prototype, "getBoundingClientRect")
        .mockImplementation(function (this: HTMLElement) {
            return this.hasAttribute("aria-current")
                ? new DOMRect(360, 0, 130, 44)
                : new DOMRect(0, 0, 270, 44);
        });
    const width = vi
        .spyOn(HTMLElement.prototype, "clientWidth", "get")
        .mockReturnValue(270);
    try {
        render(
            <MemoryRouter initialEntries={["/inventory/corrections"]}>
                <InventoryTabs />
            </MemoryRouter>,
        );
        const tabs = screen.getByRole("navigation", {
            name: "Inventory sections",
        });
        expect(tabs.scrollLeft).toBe(290);
        expect(
            within(tabs).getByRole("link", { name: "Stock Corrections" }),
        ).toHaveAttribute("aria-current", "page");
    } finally {
        width.mockRestore();
        bounds.mockRestore();
    }
});
