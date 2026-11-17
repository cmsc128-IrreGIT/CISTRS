import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
function render_form(
    initial_values?: InventoryFormValues,
    available_locations = locations,
) {
    const on_submit = vi.fn();
    const on_cancel = vi.fn();
    render(
        <InventoryForm
            initial_values={initial_values}
            locations={available_locations}
            on_submit={on_submit}
            on_cancel={on_cancel}
        />,
    );
    return { on_submit, on_cancel, user: userEvent.setup() };
}
async function fill_required(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Item name *"), " Test Filter ");
    await user.type(screen.getByLabelText("Part number *"), " TEST-001 ");
    await user.click(screen.getByLabelText("Unit *"));
    await user.click(screen.getByRole("button", { name: "Other…" }));
    const custom_unit = screen.getByLabelText("Other unit");
    expect(custom_unit).toHaveFocus();
    expect(custom_unit.parentElement).toContainElement(screen.getByLabelText("Unit *"));
    await user.type(custom_unit, " pieces ");
    await user.clear(screen.getByLabelText("Minimum stock level *"));
    await user.type(screen.getByLabelText("Minimum stock level *"), "2");
}
describe("Inventory form", () => {
    it("submits trimmed values and opening stock with a location ID", async () => {
        const { user, on_submit } = render_form();
        await fill_required(user);
        await user.selectOptions(
            screen.getByLabelText("Location"),
            "Store",
        );
        await user.clear(screen.getByLabelText("Opening quantity *"));
        await user.type(screen.getByLabelText("Opening quantity *"), "5");
        await user.click(screen.getByRole("button", { name: "Save" }));
        expect(on_submit).toHaveBeenCalledExactlyOnceWith(valid_values, {
            location_UUID: "location-1",
            quantity: 5,
        });
    });
    it("blocks blank required fields", async () => {
        const { user, on_submit } = render_form();
        await user.click(screen.getByRole("button", { name: "Save" }));
        expect(on_submit).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Item name *")).toBeInvalid();
        expect(screen.getByLabelText("Item name *")).toHaveFocus();
        expect(screen.getByText("Enter an item name. Spaces alone are not accepted.")).toBeVisible();
    });
    it("rejects whitespace names and allows correction", async () => {
        const { user, on_submit } = render_form({
            ...valid_values,
            part_name: "   ",
        });
        await user.click(screen.getByRole("button", { name: "Save" }));
        expect(on_submit).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Item name *")).toBeInvalid();
        await user.clear(screen.getByLabelText("Item name *"));
        await user.type(screen.getByLabelText("Item name *"), "Test Filter");
        await user.click(screen.getByRole("button", { name: "Save" }));
        expect(on_submit).toHaveBeenCalledExactlyOnceWith(
            valid_values,
            undefined,
        );
    });
    it("blocks negative opening quantities", async () => {
        const { user, on_submit } = render_form();
        await fill_required(user);
        await user.clear(screen.getByLabelText("Opening quantity *"));
        await user.type(screen.getByLabelText("Opening quantity *"), "-1");
        await user.click(screen.getByRole("button", { name: "Save" }));
        expect(on_submit).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Opening quantity *")).toBeInvalid();
    });
    it("requires a location when opening stock is positive", async () => {
        const { user, on_submit } = render_form();
        await fill_required(user);
        await user.clear(screen.getByLabelText("Opening quantity *"));
        await user.type(screen.getByLabelText("Opening quantity *"), "5");
        await user.click(screen.getByRole("button", { name: "Save" }));
        expect(on_submit).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Location")).toBeInvalid();
        await user.selectOptions(
            screen.getByLabelText("Location"),
            "Store",
        );
        await user.click(screen.getByRole("button", { name: "Save" }));
        expect(on_submit).toHaveBeenCalledOnce();
    });
    it("steps quantities with visible controls without going below zero", async () => {
        const { user, on_submit } = render_form();
        const opening = screen.getByLabelText("Opening quantity *");
        const increase = screen.getByRole("button", { name: "Increase opening quantity" });
        const decrease = screen.getByRole("button", { name: "Decrease opening quantity" });
        await user.click(decrease);
        expect(opening).toHaveValue(0);
        await user.click(increase);
        expect(opening).toHaveValue(1);
        await user.click(decrease);
        expect(opening).toHaveValue(0);
        await user.click(screen.getByRole("button", { name: "Increase minimum stock level" }));
        expect(screen.getByLabelText("Minimum stock level *")).toHaveValue(1);
        expect(screen.getByLabelText("Expiry date")).toBeDisabled();
        expect(on_submit).not.toHaveBeenCalled();
    });
    it("filters storage areas by location and sends the selected area's ID", async () => {
        const { user, on_submit } = render_form(undefined, [
            { ...locations[0], storage_area: "Warehouse A" },
            { ...locations[0], location_UUID: "location-2", storage_area: "Warehouse B" },
            { ...locations[0], location_UUID: "location-3", location_name: "Hangar", storage_area: "Bay 1" },
        ]);
        const location = screen.getByLabelText("Location");
        const area = screen.getByLabelText("Storage area");
        expect(area).toBeDisabled();
        await fill_required(user);
        await user.selectOptions(location, "Store");
        expect(screen.queryByRole("option", { name: "Bay 1" })).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Increase opening quantity" }));
        const save = screen.getByRole("button", { name: "Save" });
        await user.click(save);
        expect(area).toBeInvalid();
        expect(area).toHaveFocus();
        expect(on_submit).not.toHaveBeenCalled();
        await user.selectOptions(area, "location-2");
        await user.selectOptions(location, "Hangar");
        expect(area).toHaveValue("location-3");
        await user.selectOptions(location, "Store");
        expect(area).toHaveValue("");
        await user.selectOptions(area, "location-2");
        await user.click(save);
        expect(on_submit).toHaveBeenCalledExactlyOnceWith(valid_values, {
            location_UUID: "location-2",
            quantity: 1,
        });
    });
    it("does not submit when cancelled", async () => {
        const { user, on_submit, on_cancel } = render_form(valid_values);
        await user.click(screen.getByRole("button", { name: "Cancel" }));
        expect(on_cancel).toHaveBeenCalledOnce();
        expect(on_submit).not.toHaveBeenCalled();
    });
});
