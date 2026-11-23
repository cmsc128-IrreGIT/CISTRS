import { useRef, useState } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";
import FormDialog from "../../../shared/components/ui/form_dialog";
import DetailsList from "../../../shared/components/ui/details_list";
import useInventoryLocations from "../hooks/use_inventory_locations";
import { return_inventory_stock } from "../services/inventory_services";
import type { InventoryAircraftLink, InventoryItem } from "../types/inventory_types";
import { inventory_location_label } from "../utils/inventory_workflows";
import InventoryQuantityField from "./inventory_quantity_field";
import { WorkflowActions, WorkflowError, WorkflowInput, WorkflowSelect } from "./inventory_workflow_fields";

export default function InventoryReturnDialog({ item, aircraft, on_close, on_saved }: {
    item: InventoryItem;
    aircraft: InventoryAircraftLink;
    on_close: () => void;
    on_saved: () => void;
}) {
    const { locations, is_loading, error, reload } = useInventoryLocations();
    const [is_saving, set_is_saving] = useState(false);
    const [save_error, set_save_error] = useState<string | null>(null);
    const [draft, set_draft] = useState<{ location_id: string; quantity: number; remarks: string }>();
    const [review, set_review] = useState(false);
    const saving = useRef(false);
    function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (saving.current) return;
        const data = new FormData(event.currentTarget);
        const location_id = String(data.get("location") ?? "");
        const quantity = Number(data.get("quantity"));
        const remarks = String(data.get("remarks") ?? "").trim();
        if (!locations.some((location) => location.location_UUID === location_id) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > aircraft.quantity_on_aircraft) {
            set_save_error(`Select a destination and return between 1 and ${aircraft.quantity_on_aircraft} ${item.unit_of_measure}.`);
            return;
        }
        set_draft({ location_id, quantity, remarks });
        set_save_error(null);
        set_review(true);
    }
    async function save() {
        if (!draft || saving.current) return;
        saving.current = true;
        set_is_saving(true);
        set_save_error(null);
        try {
            await return_inventory_stock(item.part_UUID, aircraft.aircraft_UUID, draft.location_id, draft.quantity, draft.remarks || undefined);
            toast.success("Stock returned.", { position: "bottom-right" });
            on_saved();
            on_close();
        } catch (cause) {
            set_save_error(cause instanceof Error ? cause.message : "Could not return stock. Try again.");
        } finally {
            saving.current = false;
            set_is_saving(false);
        }
    }
    const destination = locations.find((location) => location.location_UUID === draft?.location_id);
    return <FormDialog title={review ? "Review return" : "Return"} compact is_busy={is_saving} on_close={on_close}>
        {review && draft && destination ? <>
            <div className="space-y-4 p-5">
                <WorkflowError message={save_error} />
                <div className="rounded-md bg-slate-100 p-4">
                    <DetailsList entries={[
                        { id: "item", label: "Item", value: item.part_name },
                        { id: "aircraft", label: "Aircraft", value: aircraft.registration },
                        { id: "quantity", label: "Quantity to return", value: `${draft.quantity} ${item.unit_of_measure}` },
                        { id: "location", label: "Location / Storage area", value: inventory_location_label(destination) },
                        { id: "balance", label: "New location balance", value: `${(item.locations.find((row) => row.location_UUID === draft.location_id)?.current_quantity ?? 0) + draft.quantity} ${item.unit_of_measure}` },
                        { id: "remaining", label: "Remaining on aircraft", value: `${aircraft.quantity_on_aircraft - draft.quantity} ${item.unit_of_measure}` },
                        { id: "remarks", label: "Remarks", value: draft.remarks || "—" },
                    ]} />
                </div>
            </div>
            <WorkflowActions label="Return" type="button" cancel_label="Back" on_cancel={() => { set_review(false); set_save_error(null); }} on_confirm={() => void save()} is_saving={is_saving} />
        </> : <form onSubmit={submit}>
            <fieldset disabled={is_saving || is_loading || Boolean(error)} className="space-y-4 p-5">
                <p className="rounded-md bg-slate-100 p-3 text-sm"><strong>{item.part_name}</strong> · {aircraft.registration} · {aircraft.quantity_on_aircraft} {item.unit_of_measure} assigned</p>
                <WorkflowError message={save_error} />
                <WorkflowSelect label="Location / Storage area" name="location" required default_value={draft?.location_id}>
                    <option value="">Select a destination</option>
                    {locations.map((location) => <option key={location.location_UUID} value={location.location_UUID}>{inventory_location_label(location)} · {item.locations.find((row) => row.location_UUID === location.location_UUID)?.current_quantity ?? 0} {item.unit_of_measure}</option>)}
                </WorkflowSelect>
                <InventoryQuantityField label="Quantity to return" name="quantity" min={1} max={aircraft.quantity_on_aircraft} default_value={draft?.quantity} />
                <WorkflowInput label="Remarks" name="remarks" multiline default_value={draft?.remarks} />
                <p className="text-xs text-slate-600">A return adds stock to the selected location and reduces the quantity assigned to this aircraft.</p>
            </fieldset>
            {is_loading && <p className="px-5 pb-4 text-sm">Loading locations...</p>}
            {error && <div className="px-5 pb-4"><WorkflowError message={error} /><button type="button" className="cursor-pointer underline" onClick={() => void reload()}>Try again</button></div>}
            <WorkflowActions label="Review return" on_cancel={on_close} is_saving={is_saving} disabled={is_loading || Boolean(error) || !locations.length} />
        </form>}
    </FormDialog>;
}
