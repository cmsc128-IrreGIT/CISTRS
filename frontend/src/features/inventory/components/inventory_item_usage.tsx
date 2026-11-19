import { useCallback, useRef, useState } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";
import FormField from "../../../shared/components/forms/form_field";
import FormDialog from "../../../shared/components/ui/form_dialog";
import Button from "../../../shared/components/ui/button";
import DataTable from "../../../shared/components/ui/data_table";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import { employee_name } from "../../../shared/utils/employee_name";
import useInventoryQuery from "../hooks/use_inventory_query";
import { get_inventory_aircraft, get_inventory_history, return_inventory_stock } from "../services/inventory_services";
import type { InventoryAircraftUsage } from "../services/inventory_services";
import type { InventoryItem } from "../types/inventory_types";
import { get_inventory_locations, inventory_location_label } from "../utils/inventory_workflows";
import { INVENTORY_FORM_INPUT } from "../constants/inventory_form_constants";
import { INVENTORY_PRIMARY_ACTION } from "../constants/inventory_constants";

export default function InventoryItemUsage({ item, items, read_only = false, on_saved }: {
    item: InventoryItem;
    items: InventoryItem[];
    read_only?: boolean;
    on_saved: () => void;
}) {
    const part_id = item.part_UUID;
    const [selected, set_selected] = useState<InventoryAircraftUsage | null>(null);
    const fetch_usage = useCallback(async () => {
        const [assignments, history] = await Promise.all([
            get_inventory_aircraft(part_id),
            get_inventory_history(part_id),
        ]);
        return assignments.map((assignment) => ({
            ...assignment,
            last_movement: history
                .filter((movement) => movement.aircraft === assignment.registration &&
                    (movement.transaction_type === "ISSUE" || movement.transaction_type === "RETURN"))
                .sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at))[0],
        }));
    }, [part_id]);
    const { rows, is_loading, error, reload } = useInventoryQuery(fetch_usage, true);
    if (is_loading) return <ScreenLoading compact label="Loading aircraft assignments..." />;
    if (error) return <div role="alert" className="text-sm text-red-700">
        <p>{error}</p><Button variant="ghost" onClick={() => void reload()}>Retry</Button>
    </div>;
    return <><p className="mb-3 text-sm text-slate-600">Date and updated by reflect the latest issue or return for each aircraft.</p>
        <DataTable inventory caption="Aircraft assignments" rows={rows}
        get_row_key={(row) => row.aircraft_UUID} empty_title="No aircraft assignments"
        empty_description="Stock issued to an aircraft will appear here."
        columns={[
            { id: "date", header: "Date", cell_class_name: "whitespace-nowrap !py-3", render: (row) => row.last_movement ? new Date(row.last_movement.created_at).toLocaleDateString("en-GB") : "Not recorded" },
            { id: "aircraft", header: "Aircraft", cell_class_name: "min-w-28 !py-3 font-medium", render: (row) => row.registration },
            { id: "quantity", header: "Quantity on aircraft", cell_class_name: "whitespace-nowrap !py-3 tabular-nums", render: (row) => `${row.quantity_on_aircraft} ${item.unit_of_measure}` },
            { id: "updated_by", header: "Updated by", cell_class_name: "min-w-40 !py-3", render: (row) => row.last_movement ? employee_name(row.last_movement.updater) || "Not recorded" : "Not recorded" },
            ...(!read_only ? [{ id: "action", header: "Action", cell_class_name: "w-24 whitespace-nowrap !py-3", render: (row: InventoryAircraftUsage) => <button type="button" aria-label={`Return stock from ${row.registration}`} className="inline-flex min-h-8 items-center rounded font-semibold text-link focus-visible:outline-2 focus-visible:outline-[#1d4ed8]" onClick={() => set_selected(row)}>Return</button> }] : []),
        ]} />
        {selected && !read_only && <ReturnStockDialog item={item} items={items} assignment={selected}
            on_close={() => set_selected(null)} on_saved={() => {
                set_selected(null);
                void reload();
                on_saved();
            }} />}
    </>;
}

function ReturnStockDialog({ item, items, assignment, on_close, on_saved }: {
    item: InventoryItem;
    items: InventoryItem[];
    assignment: InventoryAircraftUsage;
    on_close: () => void;
    on_saved: () => void;
}) {
    const locations = get_inventory_locations(items);
    const [saving, set_saving] = useState(false);
    const [error, set_error] = useState("");
    const pending = useRef(false);
    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (pending.current) return;
        const data = new FormData(event.currentTarget);
        const location_UUID = String(data.get("location_UUID") ?? "");
        const quantity_text = String(data.get("quantity") ?? "").trim();
        const quantity = Number(quantity_text);
        if (!locations.some((row) => row.location_UUID === location_UUID) || !quantity_text ||
            !Number.isSafeInteger(quantity) || quantity < 1 || quantity > assignment.quantity_on_aircraft) {
            set_error("Choose a destination and a quantity within the amount assigned to this aircraft.");
            return;
        }
        pending.current = true;
        set_saving(true);
        set_error("");
        try {
            await return_inventory_stock(item.part_UUID, assignment.aircraft_UUID, location_UUID, quantity, String(data.get("remarks") ?? "").trim());
            toast.success("Stock returned.", { position: "bottom-right" });
            on_saved();
        } catch (cause) {
            set_error(cause instanceof Error ? cause.message : "Could not return stock.");
        } finally {
            pending.current = false;
            set_saving(false);
        }
    }
    return <FormDialog title="Return" compact is_busy={saving} on_close={on_close}>
        <form onSubmit={submit}>
            <div className="space-y-4 px-4 py-4 sm:px-5">
                <div className="rounded-md bg-slate-100 p-3 text-sm">
                    <p className="font-semibold">{item.part_name}</p>
                    <p>{assignment.registration} · {assignment.quantity_on_aircraft} {item.unit_of_measure} assigned</p>
                </div>
                <p className="text-xs text-slate-600"><span className="text-red-700">*</span> indicates a required field.</p>
                {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
                <fieldset disabled={saving} className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <legend className="sr-only">Return stock</legend>
                    <FormField label="Location / Storage area" required>
                        {(props) => <select {...props} name="location_UUID" required defaultValue={locations.length === 1 ? locations[0].location_UUID : ""} className={INVENTORY_FORM_INPUT}>
                            <option value="">Select destination</option>
                            {locations.map((row) => <option key={row.location_UUID} value={row.location_UUID}>{inventory_location_label(row)} · {item.locations.find((location) => location.location_UUID === row.location_UUID)?.current_quantity ?? 0} {item.unit_of_measure}</option>)}
                        </select>}
                    </FormField>
                    <FormField label="Quantity to return" required>
                        {(props) => <input {...props} name="quantity" type="number" required min={1} max={assignment.quantity_on_aircraft} step={1} className={INVENTORY_FORM_INPUT} />}
                    </FormField>
                    <div className="sm:col-span-2"><FormField label="Remarks">
                        {(props) => <textarea {...props} name="remarks" rows={3} maxLength={500} className={INVENTORY_FORM_INPUT} />}
                    </FormField></div>
                </fieldset>
                <p className="rounded-md bg-slate-100 p-3 text-xs text-slate-700">A return adds stock to the destination location, reduces the aircraft's assigned quantity, and records a return in Stock History.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3 sm:px-5">
                <Button type="button" variant="secondary" disabled={saving} onClick={on_close}>Cancel</Button>
                <Button type="submit" is_loading={saving} disabled={!locations.length} className={INVENTORY_PRIMARY_ACTION}>Return</Button>
            </div>
        </form>
    </FormDialog>;
}
