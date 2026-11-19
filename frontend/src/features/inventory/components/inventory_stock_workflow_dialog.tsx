import { useRef, useState } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";
import FormField from "../../../shared/components/forms/form_field";
import FormDialog from "../../../shared/components/ui/form_dialog";
import Button from "../../../shared/components/ui/button";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import { INVENTORY_FORM_INPUT } from "../constants/inventory_form_constants";
import { INVENTORY_PRIMARY_ACTION } from "../constants/inventory_constants";
import { MAX_LOCATION_QUANTITY, STOCK_WORKFLOW_TITLES } from "../constants/inventory_workflow_constants";
import { get_inventory_item, issue_inventory_stock, set_inventory_stock } from "../services/inventory_services";
import type { InventoryItem } from "../types/inventory_types";
import { get_inventory_locations, inventory_location_label } from "../utils/inventory_workflows";
import InventoryQuantityField from "./inventory_quantity_field";

type Mode = keyof typeof STOCK_WORKFLOW_TITLES;

export default function InventoryStockWorkflowDialog({ mode, item, items, on_close, on_saved }: {
    mode: Mode;
    item: InventoryItem;
    items: InventoryItem[];
    on_close: () => void;
    on_saved: () => void;
}) {
    const aircraft = useAircraft();
    const [location_id, set_location_id] = useState("");
    const [error, set_error] = useState("");
    const [saving, set_saving] = useState(false);
    const pending = useRef(false);
    const issue = mode === "issue";
    const correction = mode === "correction";
    const quantity_at = (id: string) => item.locations.find((row) => row.location_UUID === id)?.current_quantity ?? 0;
    const locations = get_inventory_locations(items).filter((row) => !issue || quantity_at(row.location_UUID) > 0);
    const selected = locations.find((row) => row.location_UUID === location_id) ?? (locations.length === 1 ? locations[0] : undefined);
    const balance = selected ? quantity_at(selected.location_UUID) : 0;

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (pending.current) return;
        const data = new FormData(event.currentTarget);
        const quantity_text = String(data.get("quantity") ?? "").trim();
        const quantity = Number(quantity_text);
        const remarks = String(data.get("remarks") ?? "").trim();
        const aircraft_UUID = String(data.get("aircraft_UUID") ?? "");
        set_error("");
        if (!selected || !quantity_text || !Number.isSafeInteger(quantity) || quantity < (correction ? 0 : 1) || quantity > MAX_LOCATION_QUANTITY) {
            set_error("Select a location and enter a valid whole quantity.");
            return;
        }
        if (issue && !aircraft_UUID) {
            set_error("Select the aircraft receiving this stock.");
            return;
        }
        if (remarks.length > 450) {
            set_error("Keep remarks within 450 characters.");
            return;
        }
        pending.current = true;
        set_saving(true);
        try {
            if (issue) {
                await issue_inventory_stock(item.part_UUID, aircraft_UUID, selected.location_UUID, quantity, remarks);
            } else {
                const current = await get_inventory_item(item.part_UUID);
                const current_balance = current.locations.find((row) => row.location_UUID === selected.location_UUID)?.current_quantity ?? 0;
                if (current_balance !== balance) throw new Error("Stock has changed. Close this form, refresh the item, and try again.");
                const next_quantity = correction ? quantity : current_balance + quantity;
                if (next_quantity > MAX_LOCATION_QUANTITY) throw new Error("The resulting quantity is too large.");
                await set_inventory_stock(item.part_UUID, selected.location_UUID, next_quantity,
                    [correction ? "Stock count correction" : "Stock received", remarks].filter(Boolean).join(": "));
            }
            toast.success(issue ? "Stock issued to aircraft." : correction ? "Stock quantity corrected." : "Stock quantity increased.", { position: "bottom-right" });
            on_saved();
        } catch (cause) {
            set_error(cause instanceof Error ? cause.message : "Could not save this stock movement.");
        } finally {
            pending.current = false;
            set_saving(false);
        }
    }

    return <FormDialog title={correction ? "Correct stock quantity" : STOCK_WORKFLOW_TITLES[mode]} compact is_busy={saving} on_close={on_close}>
        <form onSubmit={submit}>
            <div className="space-y-4 px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm">
                    <p className="font-semibold">{item.part_name}</p>
                    <p className="border-l border-slate-300 pl-3 text-slate-600"><span className="font-semibold text-[#0b2238]">{item.total_quantity} {item.unit_of_measure}</span> currently available</p>
                </div>
                <p className="text-xs text-slate-600"><span className="text-red-700">*</span> indicates a required field.</p>
                {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
                {!locations.length && <p role="status" className="text-sm text-slate-600">No suitable stock locations are available.</p>}
                <fieldset disabled={saving} className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <legend className="sr-only">Stock movement</legend>
                    <FormField label="Location / Storage area" required>
                        {(props) => <select {...props} required value={selected?.location_UUID ?? ""} onChange={(event) => set_location_id(event.currentTarget.value)} className={INVENTORY_FORM_INPUT}>
                            <option value="">Select a location</option>
                            {locations.map((row) => <option key={row.location_UUID} value={row.location_UUID}>{inventory_location_label(row)} · {quantity_at(row.location_UUID)} {item.unit_of_measure}</option>)}
                        </select>}
                    </FormField>
                    <InventoryQuantityField name="quantity" label={correction ? "Counted quantity" : issue ? "Quantity issued" : "Quantity received"}
                        min={correction ? 0 : 1} max={issue ? balance : MAX_LOCATION_QUANTITY} />
                    {issue && <FormField label="Aircraft" required>
                        {(props) => <select {...props} name="aircraft_UUID" required className={INVENTORY_FORM_INPUT}>
                            <option value="">Select aircraft</option>
                            {aircraft.map((row) => <option key={row.aircraft_UUID} value={row.aircraft_UUID}>{row.registration}</option>)}
                        </select>}
                    </FormField>}
                    <div className="sm:col-span-2">
                        <FormField label={correction ? "Reason" : "Remarks"} required={correction}>
                            {(props) => <textarea {...props} name="remarks" rows={3} required={correction} maxLength={450} className={INVENTORY_FORM_INPUT} />}
                        </FormField>
                    </div>
                </fieldset>
                {selected && <p className="text-xs text-slate-600">Recorded location balance: {balance} {item.unit_of_measure}</p>}
                <p className="rounded-md bg-slate-100 p-3 text-xs text-slate-700">
                    {issue ? "An issue deducts stock from the selected location and assigns it to the selected aircraft."
                        : correction ? "A correction sets the selected location to the counted quantity and records the difference as an adjustment."
                        : "A receipt adds stock to the selected location. The quantity change is saved as an adjustment in Stock History."}
                </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3 sm:px-5">
                <Button type="button" variant="secondary" disabled={saving} onClick={on_close}>Cancel</Button>
                <Button type="submit" is_loading={saving} disabled={!selected || (issue && !aircraft.length)} className={INVENTORY_PRIMARY_ACTION}>Save stock movement</Button>
            </div>
        </form>
    </FormDialog>;
}
