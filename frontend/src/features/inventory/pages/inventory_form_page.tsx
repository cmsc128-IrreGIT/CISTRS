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
import useInventoryLocations from "../hooks/use_inventory_locations";

export default function InventoryFormPage() {
    const { item_id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { items, is_loading, error, refresh } =
        useOutletContext<ReturnType<typeof useInventory>>();
    const [is_saving, set_is_saving] = useState(false);
    const [save_error, set_save_error] = useState<string | null>(null);
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
    const { locations, is_loading: locations_loading, error: locations_error, reload: reload_locations } = useInventoryLocations();
    const existing_item = items.find((item) => item.part_UUID === item_id);
    const is_editing = Boolean(item_id);
    const units = [...new Set(items.map((item) => item.unit_of_measure.trim()).filter(Boolean))].sort();

    async function handle_save(
        values: InventoryFormValues,
        initial_stock?: InitialStock,
    ) {
        if (is_saving) return;
        set_is_saving(true);
        set_save_error(null);
        try {
            if (item_id) {
                await update_inventory_item(item_id, values);

                toast.success("Inventory item updated.", { position: "bottom-right" });
            } else {
                await create_inventory_item({
                    ...values,
                    initial_stock,
                });

                toast.success("Inventory item added.", { position: "bottom-right" });
            }

            if (mounted.current) close_form();
            void refresh();
        } catch (error) {
            if (mounted.current) {
                set_save_error(error instanceof Error && error.message
                    ? error.message
                    : "The inventory request failed.");
            }
        } finally {
            if (mounted.current) set_is_saving(false);
        }
    }

    return (
        <FormDialog
            title={is_editing ? "Edit inventory item" : "Add inventory item"}
            on_close={close_form}
            compact
            is_busy={is_saving}
        >
            {is_loading || (!is_editing && locations_loading) ? (
                <div className="p-4">
                    <ScreenLoading compact label="Loading inventory…" />
                </div>
            ) : error || (!is_editing && locations_error) ? (
                <p role="alert" className="p-4 text-sm text-red-700">
                    {error || locations_error}
                    {!error && <button type="button" className="ml-2 underline" onClick={() => void reload_locations()}>Try again</button>}
                </p>
            ) : is_editing && !existing_item ? (
                <div className="p-4"><InventoryNotFound /></div>
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
                    item={existing_item}
                    locations={locations}
                    units={units}
                    on_submit={handle_save}
                    on_cancel={close_form}
                    is_saving={is_saving}
                    save_error={save_error}
                />
            )}
        </FormDialog>
    );
}
