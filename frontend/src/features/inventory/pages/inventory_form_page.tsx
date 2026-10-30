import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import FormDialog from "../../../shared/components/ui/form_dialog";
import InventoryForm from "../components/inventory_form";
import InventoryNotFound from "../components/inventory_not_found";
import {
    create_inventory_item,
    update_inventory_item,
} from "../services/inventory_services";
import useInventory from "../hooks/use_inventory";
import type {
    InitialStock,
    InventoryFormValues,
} from "../types/inventory_types";

export default function InventoryFormPage() {
    const { item_id } = useParams();
    const navigate = useNavigate();
    const { items, is_loading, error } = useInventory();
    const locations = Array.from(
        new Map(
            items
                .flatMap((item) => item.locations)
                .map((location) => [location.location_UUID, location]),
        ).values(),
    );
    const existing_item = items.find((item) => item.part_UUID === item_id);
    const is_editing = Boolean(item_id);

    async function handle_save(
        values: InventoryFormValues,
        initial_stock?: InitialStock,
    ) {
        try {
            if (is_editing && item_id) {
                await update_inventory_item(item_id, values);

                toast.success("Inventory item updated successfully.");
            } else {
                await create_inventory_item({
                    ...values,
                    initial_stock,
                });

                toast.success("Inventory item added successfully.");
            }

            navigate("/inventory");
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Could not save inventory item.",
            );
        }
    }

    return (
        <FormDialog
            title={is_editing ? "Edit Inventory Item" : "Add Inventory Item"}
            on_close={() => navigate("/inventory")}
        >
            {is_loading ? (
                <ScreenLoading compact label="Loading inventory…" />
            ) : error ? (
                <p role="alert" className="text-sm text-red-700">
                    {error}
                </p>
            ) : is_editing && !existing_item ? (
                <InventoryNotFound />
            ) : (
                <InventoryForm
                    key={item_id ?? "new"}
                    initial_values={
                        existing_item
                            ? {
                                  part_name: existing_item.part_name,
                                  part_number: existing_item.part_number,
                                  unit_of_measure:
                                      existing_item.unit_of_measure,
                                  min_stock_level:
                                      existing_item.min_stock_level,
                                  description: existing_item.description ?? "",
                              }
                            : undefined
                    }
                    locations={locations}
                    on_submit={handle_save}
                    submit_text={
                        is_editing
                            ? "Edit Inventory Item"
                            : "Add Inventory Item"
                    }
                />
            )}
        </FormDialog>
    );
}
