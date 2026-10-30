import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import InventoryForm from "../../src/features/inventory/components/inventory_form";
import type {
    InventoryFormValues,
    InventoryLocation,
} from "../../src/features/inventory/types/inventory_types";

afterEach(cleanup);
const valid_values: InventoryFormValues = {
    part_name: "Test Filter",
    part_number: "TEST-001",
    unit_of_measure: "pieces",
    min_stock_level: 2,
    description: "",
};
const locations: InventoryLocation[] = [
    {
        status_UUID: "status-1",
        location_UUID: "location-1",
        location_name: "Store",
        storage_area: null,
        current_quantity: 0,
    },
];
function render_form(initial_values?: InventoryFormValues) {
    const on_submit = vi.fn();
    render(
        <MemoryRouter>
            <InventoryForm
                initial_values={initial_values}
                locations={locations}
                on_submit={on_submit}
                submit_text="Save Item"
            />
        </MemoryRouter>,
    );
    return { on_submit, user: userEvent.setup() };
}
async function fill_required(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Item Name *"), " Test Filter ");
    await user.type(screen.getByLabelText("Part Number *"), " TEST-001 ");
    await user.type(screen.getByLabelText("Unit of Measure *"), " pieces ");
    await user.clear(screen.getByLabelText("Minimum Stock Level *"));
    await user.type(screen.getByLabelText("Minimum Stock Level *"), "2");
}
describe("Inventory form", () => {
    it("submits trimmed values and opening stock with a location ID", async () => {
        const { user, on_submit } = render_form();
        await fill_required(user);
        await user.selectOptions(
            screen.getByLabelText("Location"),
            "location-1",
        );
        await user.clear(screen.getByLabelText("Quantity"));
        await user.type(screen.getByLabelText("Quantity"), "5");
        await user.click(screen.getByRole("button", { name: "Save Item" }));
        expect(on_submit).toHaveBeenCalledExactlyOnceWith(valid_values, {
            location_UUID: "location-1",
            quantity: 5,
        });
    });
    it("blocks blank required fields", async () => {
        const { user, on_submit } = render_form();
        await user.click(screen.getByRole("button", { name: "Save Item" }));
        expect(on_submit).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Item Name *")).toBeInvalid();
    });
    it("rejects whitespace names and allows correction", async () => {
        const { user, on_submit } = render_form({
            ...valid_values,
            part_name: "   ",
        });
        await user.click(screen.getByRole("button", { name: "Save Item" }));
        expect(on_submit).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Item Name *")).toBeInvalid();
        await user.clear(screen.getByLabelText("Item Name *"));
        await user.type(screen.getByLabelText("Item Name *"), "Test Filter");
        await user.click(screen.getByRole("button", { name: "Save Item" }));
        expect(on_submit).toHaveBeenCalledExactlyOnceWith(
            valid_values,
            undefined,
        );
    });
    it("blocks negative opening quantities", async () => {
        const { user, on_submit } = render_form();
        await fill_required(user);
        await user.clear(screen.getByLabelText("Quantity"));
        await user.type(screen.getByLabelText("Quantity"), "-1");
        await user.click(screen.getByRole("button", { name: "Save Item" }));
        expect(on_submit).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Quantity")).toBeInvalid();
    });
    it("requires a location when opening stock is positive", async () => {
        const { user, on_submit } = render_form();
        await fill_required(user);
        await user.clear(screen.getByLabelText("Quantity"));
        await user.type(screen.getByLabelText("Quantity"), "5");
        await user.click(screen.getByRole("button", { name: "Save Item" }));
        expect(on_submit).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Location")).toBeInvalid();
        await user.selectOptions(
            screen.getByLabelText("Location"),
            "location-1",
        );
        await user.click(screen.getByRole("button", { name: "Save Item" }));
        expect(on_submit).toHaveBeenCalledOnce();
    });
    it("does not submit when cancelled", async () => {
        const { user, on_submit } = render_form(valid_values);
        await user.click(screen.getByRole("link", { name: "Cancel" }));
        expect(on_submit).not.toHaveBeenCalled();
    });
});
