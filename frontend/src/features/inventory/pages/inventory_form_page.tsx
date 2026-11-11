import { useEffect, useRef, useState } from "react";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import {
    useLocation,
    useNavigate,
    useOutletContext,
    useParams,
} from "react-router";
import { toast } from "sonner";
import FormDialog from "../../../shared/components/ui/form_dialog";
import InventoryForm from "../components/inventory_form";
import InventoryNotFound from "../components/inventory_not_found";
import {
    create_inventory_item,
    update_inventory_item,
} from "../services/inventory_services";
import type useInventory from "../hooks/use_inventory";
import type {
    InitialStock,
    InventoryFormValues,
} from "../types/inventory_types";

export default function InventoryFormPage() {
    const { item_id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { items, is_loading, error, refresh } =
        useOutletContext<ReturnType<typeof useInventory>>();
    const [is_saving, set_is_saving] = useState(false);
    const mounted = useRef(false);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    function close_form() {
        if (location.state?.from_inventory === true) {
            void navigate(-1);
        } else {
            void navigate(
                { pathname: "..", search: location.search },
                { replace: true },
            );
        }
    }
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
        if (is_saving) return;
        set_is_saving(true);
        try {
            if (item_id) {
                await update_inventory_item(item_id, values);

                toast.success("Inventory item updated successfully.");
            } else {
                await create_inventory_item({
                    ...values,
                    initial_stock,
                });

                toast.success("Inventory item added successfully.");
            }

            if (mounted.current) close_form();
            void refresh();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Could not save inventory item.",
            );
        } finally {
            if (mounted.current) set_is_saving(false);
        }
    }

    return (
        <FormDialog
            title={is_editing ? "Edit Inventory Item" : "Add Inventory Item"}
            on_close={close_form}
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
                    on_cancel={close_form}
                    is_saving={is_saving}
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
