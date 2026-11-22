import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { toast } from "sonner";
import { afterEach, expect, it, vi } from "vitest";
import InventoryFormPage from "../../src/features/inventory/pages/inventory_form_page";
import * as services from "../../src/features/inventory/services/inventory_services";
import type { InventoryItem } from "../../src/features/inventory/types/inventory_types";

const item: InventoryItem = {
    part_UUID: "part-1",
    part_number: "H-001",
    part_name: "Hydraulic hose",
    category: "Hydraulic",
    unit_of_measure: "pcs",
    min_stock_level: 2,
    description: "Replacement hose",
    total_quantity: 3,
    is_low_stock: false,
    locations: [],
    suppliers: [],
    manufacturers: [],
};

const dialog_methods = {
    showModal: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal"),
    close: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close"),
};

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    for (const [name, descriptor] of Object.entries(dialog_methods)) {
        if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
        else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
    }
});

function render_route(path: string) {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
        configurable: true,
        value(this: HTMLDialogElement) { this.setAttribute("open", ""); },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
        configurable: true,
        value(this: HTMLDialogElement) { this.removeAttribute("open"); },
    });
    const refresh = vi.fn().mockResolvedValue(undefined);
    const context = { items: [item], error: null, is_loading: false, refresh };
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/inventory" element={<><h1>Inventory</h1><Outlet context={context} /></>}>
                    <Route path="new" element={<InventoryFormPage />} />
                </Route>
                <Route path="/inventory/:item_id" element={<><h1>{item.part_name}</h1><Outlet context={context} /></>}>
                    <Route path="edit" element={<InventoryFormPage />} />
                </Route>
            </Routes>
        </MemoryRouter>,
    );
    return { user: userEvent.setup(), refresh };
}

it("keeps the add form and optional details open after a failed save, then refreshes on retry", async () => {
    const create = vi.spyOn(services, "create_inventory_item")
        .mockRejectedValueOnce(new Error("Inventory service unavailable."))
        .mockResolvedValueOnce(item);
    const success = vi.spyOn(toast, "success").mockImplementation(() => "added");
    const { user, refresh } = render_route("/inventory/new");
    await user.type(screen.getByLabelText("Item name *"), item.part_name);
    await user.type(screen.getByLabelText("Part number *"), item.part_number);
    const unit = screen.getByLabelText("Unit *");
    await user.click(unit);
    expect(unit).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(unit).toHaveAttribute("aria-expanded", "false");
    expect(unit).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: item.unit_of_measure }));
    expect(unit).toHaveAttribute("aria-expanded", "false");
    await user.click(screen.getByText("Additional information", { selector: "summary" }));
    const description = screen.getByLabelText("Description");
    await user.type(description, "Replacement hose");
    const save = screen.getByRole("button", { name: "Save" });
    await user.click(save);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Your entries are kept.");
    expect(alert).toHaveFocus();
    expect(description.closest("details")).toHaveAttribute("open");
    expect(description).toHaveValue("Replacement hose");
    expect(screen.getByLabelText("Item name *")).toHaveValue(item.part_name);
    expect(refresh).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();

    await user.click(save);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Inventory" })).toBeVisible();
    expect(create).toHaveBeenLastCalledWith({
        part_name: item.part_name,
        part_number: item.part_number,
        unit_of_measure: item.unit_of_measure,
        min_stock_level: 0,
        description: "Replacement hose",
        initial_stock: undefined,
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(success).toHaveBeenCalledWith("Inventory item added.", { position: "bottom-right" });
});

it("prefills edit fields and returns to the item after saving supported fields", async () => {
    const update = vi.spyOn(services, "update_inventory_item").mockResolvedValue(item);
    const success = vi.spyOn(toast, "success").mockImplementation(() => "updated");
    const { user, refresh } = render_route("/inventory/part-1/edit");
    const name = screen.getByLabelText("Item name *");
    expect(name).toHaveValue(item.part_name);
    expect(screen.getByLabelText("Category")).toHaveValue("Hydraulic");
    expect(screen.getByLabelText("Category")).toBeDisabled();
    expect(screen.getByLabelText("Current quantity")).toHaveValue("3");
    await user.clear(name);
    await user.type(name, "Hydraulic hose B");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(update).toHaveBeenCalledExactlyOnceWith(item.part_UUID, {
        part_name: "Hydraulic hose B",
        part_number: item.part_number,
        unit_of_measure: item.unit_of_measure,
        min_stock_level: item.min_stock_level,
        description: item.description,
    });
    expect(screen.getByRole("heading", { name: item.part_name })).toBeVisible();
    expect(refresh).toHaveBeenCalledOnce();
    expect(success).toHaveBeenCalledWith("Inventory item updated.", { position: "bottom-right" });
});
