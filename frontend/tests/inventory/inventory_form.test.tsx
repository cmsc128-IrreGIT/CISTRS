import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import InventoryForm from "../../src/features/inventory/components/inventory_form";
import type { InventoryFormValues } from "../../src/features/inventory/types/inventory_types";

const valid_values: InventoryFormValues = {
    name: "Test Filter",
    part_number: "TEST-001",
    category: "Consumable",
    quantity: 5,
    unit: "pieces",
    aircraft: null,
};

function render_form(initial_values?: InventoryFormValues) {
    const on_submit = vi.fn();

    render(
        <MemoryRouter>
            <InventoryForm
                initial_values={initial_values}
                on_submit={on_submit}
                submit_text="Save Item"
            />
        </MemoryRouter>,
    );

    return { on_submit, user: userEvent.setup() };
}

describe("Inventory form", () => {
    it("submits valid item values with surrounding spaces removed", async () => {
        const { on_submit, user } = render_form();

        await user.type(screen.getByLabelText("Item Name *"), " Test Filter ");
        await user.type(screen.getByLabelText("Part Number *"), " TEST-001 ");
        await user.type(screen.getByLabelText("Category *"), "Consumable");
        await user.type(screen.getByLabelText("Unit *"), "pieces");
        await user.clear(screen.getByLabelText("Quantity *"));
        await user.type(screen.getByLabelText("Quantity *"), "5");
        await user.click(screen.getByRole("button", { name: "Save Item" }));

        expect(on_submit).toHaveBeenCalledExactlyOnceWith(valid_values);
    });

    it("blocks submission when required fields are blank", async () => {
        const { on_submit, user } = render_form();

        await user.click(screen.getByRole("button", { name: "Save Item" }));

        expect(on_submit).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Item Name *")).toBeInvalid();
    });

    it("rejects a whitespace-only name and allows correction", async () => {
        const { on_submit, user } = render_form({
            ...valid_values,
            name: "   ",
        });

        await user.click(screen.getByRole("button", { name: "Save Item" }));

        expect(on_submit).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Item Name *")).toBeInvalid();

        await user.clear(screen.getByLabelText("Item Name *"));
        await user.type(screen.getByLabelText("Item Name *"), "Test Filter");
        await user.click(screen.getByRole("button", { name: "Save Item" }));

        expect(on_submit).toHaveBeenCalledExactlyOnceWith(valid_values);
    });

    it("blocks negative quantities", async () => {
        const { on_submit, user } = render_form({
            ...valid_values,
            quantity: -1,
        });

        await user.click(screen.getByRole("button", { name: "Save Item" }));

        expect(on_submit).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Quantity *")).toBeInvalid();
    });

    it("does not submit when Cancel is selected", async () => {
        const { on_submit, user } = render_form(valid_values);

        await user.click(screen.getByRole("link", { name: "Cancel" }));

        expect(on_submit).not.toHaveBeenCalled();
    });
});
