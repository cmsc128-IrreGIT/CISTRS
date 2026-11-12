import { useContext, useState } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import Button from "../../../shared/components/ui/button";
import StatusBadge from "../../../shared/components/ui/status_badge";
import DetailsList from "../../../shared/components/ui/details_list";
import FormDialog from "../../../shared/components/ui/form_dialog";
import FormField from "../../../shared/components/forms/form_field";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import { AuthContext } from "../../auth/hooks/auth_context";
import { INVENTORY_FORM_INPUT } from "../constants/inventory_form_constants";
import {
    MAX_LOCATION_QUANTITY,
    STOCK_PREVIEW_NOTICE,
    STOCK_WORKFLOW_DIALOG_CONTENT,
    STOCK_WORKFLOW_TITLES,
} from "../constants/inventory_workflow_constants";
import { add_inventory_request_preview } from "../hooks/use_inventory_request_previews";
import type { InventoryItem } from "../types/inventory_types";
import { format_signed_quantity } from "../utils/stock_history";
import {
    get_inventory_locations,
    inventory_location_label,
    inventory_today,
} from "../utils/inventory_workflows";
import InventoryQuantityField from "./inventory_quantity_field";
import { WorkflowActions, WorkflowError, WorkflowInput, WorkflowNotice, WorkflowSelect } from "./inventory_workflow_fields";

type Mode = keyof typeof STOCK_WORKFLOW_TITLES;
type Draft = {
    quantity: number;
    movement_date: string;
    reference: string;
    contact: string;
    aircraft: string;
    remarks: string;
};

export default function InventoryStockWorkflowDialog({
    mode,
    item,
    items,
    on_close,
}: {
    mode: Mode;
    item: InventoryItem;
    items: InventoryItem[];
    on_close: () => void;
}) {
    const username = useContext(AuthContext)?.user?.username ?? "Current user";
    const [save_error, set_save_error] = useState<string | null>(null);
    const [location_id, set_location_id] = useState("");
    const [draft, set_draft] = useState<Draft>();
    const [counted, set_counted] = useState("");
    const [step, set_step] = useState<"form" | "review" | "issue_result">("form");
    const [supplier_choice, set_supplier_choice] = useState("");
    const aircraft = useAircraft();
    const issue = mode === "issue";
    const correction = mode === "correction";
    const unit = item.unit_of_measure;
    const registrations = [...new Set(aircraft.map((row) => row.registration?.trim()).filter(Boolean))];
    const suppliers = [...new Set(item.suppliers.map((name) => name.trim()).filter(Boolean))];
    const quantity_at = (id: string) =>
        item.locations.find((location) => location.location_UUID === id)?.current_quantity ?? 0;
    const locations = get_inventory_locations(items)
        .filter((location) => !issue || quantity_at(location.location_UUID) > 0);
    const selected = locations.find((location) => location.location_UUID === location_id) ??
        (locations.length === 1 ? locations[0] : undefined);
    const balance = selected ? quantity_at(selected.location_UUID) : 0;

    function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (name: string) => String(data.get(name) ?? "").trim();
        const values: Draft = {
            quantity: Number(text("quantity")),
            movement_date: text("movement_date"),
            reference: text("reference"),
            contact: text("contact"),
            aircraft: text("aircraft"),
            remarks: text("remarks"),
        };
        if (!selected || (!correction && !values.reference) || ((issue || correction) && !values.remarks) || (issue && !values.contact)) {
            set_save_error("Complete all required fields before continuing.");
        } else if (issue && values.quantity > balance) {
            set_save_error(`Only ${balance} ${unit} are available at this location.`);
        } else if (correction && values.quantity === balance) {
            set_save_error("The counted quantity already matches recorded stock.");
        } else if (correction) {
            add_inventory_request_preview({
                kind: "CORRECTION",
                part: item,
                location: selected,
                quantity: values.quantity,
                recorded_quantity: balance,
                reason: values.remarks,
                reference: values.reference || null,
            }, username);
            toast.success("Stock correction preview added.", { position: "bottom-right" });
            on_close();
        } else {
            set_draft(values);
            set_save_error(null);
            set_step("review");
        }
    }

    if (step === "issue_result" && draft) {
        const projected = item.total_quantity - draft.quantity;
        return (
            <FormDialog title="Stock issue result preview" compact on_close={on_close}>
                <div className="space-y-4 p-5">
                    <WorkflowNotice>{STOCK_PREVIEW_NOTICE}</WorkflowNotice>
                    <div className="flex items-center gap-3 rounded-md bg-slate-100 p-4">
                        <CheckCircle2 size={24} aria-hidden="true" className="text-emerald-700" />
                        <div>
                            <p className="text-xs text-slate-600">Projected total</p>
                            <p className="font-semibold">{projected} {unit}</p>
                        </div>
                        <StatusBadge tone={projected === 0 ? "danger" : projected < item.min_stock_level ? "warning" : "success"}>
                            {projected === 0 ? "Out of stock" : projected < item.min_stock_level ? "Low stock" : "In stock"}
                        </StatusBadge>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={on_close}>Done</Button>
                    </div>
                </div>
            </FormDialog>
        );
    }
    return (
        <FormDialog title={step === "review" ? (issue ? "Review stock issue" : "Review stock receipt") : STOCK_WORKFLOW_TITLES[mode]}
            compact on_close={on_close}>
            {step === "review" && draft && selected ? (
                <>
                    <div className={STOCK_WORKFLOW_DIALOG_CONTENT}>
                        <WorkflowNotice>{STOCK_PREVIEW_NOTICE}</WorkflowNotice>
                        <div className="rounded-md bg-slate-100 p-4">
                            <DetailsList entries={[
                                { id: "item", label: "Item", value: item.part_name },
                                { id: "quantity", label: issue ? "Quantity issued" : "Quantity received", value: `${draft.quantity} ${unit}` },
                                { id: "balance", label: "Projected location balance", value: `${balance + (issue ? -draft.quantity : draft.quantity)} ${unit}` },
                                ...(!issue ? [{ id: "total", label: "Projected total", value: `${item.total_quantity + draft.quantity} ${unit}` }] : []),
                                { id: "contact", label: issue ? "Recipient" : "Supplier", value: draft.contact || "—" },
                                { id: "date", label: issue ? "Issue date" : "Date received", value: draft.movement_date },
                                { id: "location", label: "Location / Storage area", value: inventory_location_label(selected) },
                                ...(issue ? [{ id: "aircraft", label: "Aircraft", value: draft.aircraft || "—" }] : []),
                                { id: "reference", label: issue ? "Work order / reference" : "Delivery reference", value: draft.reference },
                                { id: "remarks", label: issue ? "Purpose" : "Remarks", value: draft.remarks || "—" },
                            ]} />
                        </div>
                        {issue && item.total_quantity === draft.quantity && <WorkflowNotice>This issue will leave the item out of stock.</WorkflowNotice>}
                    </div>
                    <WorkflowActions label={issue ? "Preview result" : "Done"} type="button"
                        cancel_label={issue ? undefined : "Back"}
                        on_cancel={() => set_step("form")}
                        on_confirm={issue ? () => set_step("issue_result") : on_close} />
                </>
            ) : !locations.length ? (
                <div className={STOCK_WORKFLOW_DIALOG_CONTENT}>
                    <p className="text-sm text-slate-600">{issue ? "No location has stock available to issue." : "No inventory locations are available."}</p>
                </div>
            ) : (
                <form onSubmit={submit}>
                    <fieldset className={STOCK_WORKFLOW_DIALOG_CONTENT}>
                        <WorkflowError message={save_error} />
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm">
                            <p className="min-w-0 wrap-anywhere font-semibold">{item.part_name}</p>
                            <p className="border-l border-slate-300 pl-3 text-slate-600">
                                <span className="font-semibold text-[#0b2238]">{item.total_quantity} {unit}</span>{" "}
                                currently available
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <p className="text-xs text-slate-600 sm:col-span-2">
                                <span className="text-red-700">*</span> indicates a required field.
                            </p>
                            <div className={issue ? "min-w-0" : "sm:col-span-2"}>
                                <FormField label="Location / Storage area" required>
                                    {(props) => (
                                        <select {...props} value={selected?.location_UUID ?? ""} className={INVENTORY_FORM_INPUT}
                                            onChange={(event) => set_location_id(event.currentTarget.value)}>
                                            <option value="">Select a location</option>
                                            {locations.map((location) => (
                                                <option key={location.location_UUID} value={location.location_UUID}>
                                                    {inventory_location_label(location)} · {quantity_at(location.location_UUID)} {unit}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </FormField>
                            </div>
                            <InventoryQuantityField name="quantity"
                                label={correction ? "Counted quantity" : issue ? "Quantity issued" : "Quantity received"}
                                placeholder={correction ? "Enter counted quantity" : "Enter quantity"}
                                min={correction ? 0 : 1} max={MAX_LOCATION_QUANTITY}
                                default_value={draft?.quantity ?? (correction && counted ? Number(counted) : undefined)}
                                on_value_change={correction ? set_counted : undefined} />
                            {issue && (
                                <WorkflowSelect label="Aircraft" name="aircraft" default_value={draft?.aircraft ?? ""}>
                                    <option value="">{registrations.length ? "Select an aircraft" : "No aircraft available"}</option>
                                    {registrations.map((registration) => <option key={registration} value={registration}>{registration}</option>)}
                                </WorkflowSelect>
                            )}
                            {!correction && (
                                <WorkflowInput name="movement_date" label={issue ? "Issue date" : "Date received"}
                                    type="date" required default_value={draft?.movement_date ?? inventory_today()} />
                            )}
                            {issue && (
                                <WorkflowInput name="contact" label="Recipient" placeholder="Enter recipient name"
                                    required default_value={draft?.contact} />
                            )}
                            {!issue && !correction && (
                                <div className="space-y-2">
                                    <WorkflowSelect label="Supplier" value={supplier_choice} on_change={set_supplier_choice}>
                                        <option value="">Select a supplier</option>
                                        {suppliers.map((supplier) => <option key={supplier} value={`supplier:${supplier}`}>{supplier}</option>)}
                                        <option value="other">Other…</option>
                                    </WorkflowSelect>
                                    {supplier_choice === "other" ? (
                                        <WorkflowInput name="contact" label="Other supplier" placeholder="Enter supplier name" default_value={draft?.contact} />
                                    ) : (
                                        <input type="hidden" name="contact" value={supplier_choice.slice("supplier:".length)} />
                                    )}
                                </div>
                            )}
                            {correction && <WorkflowInput name="remarks" label="Reason" placeholder="Explain why the count differs" required />}
                            <WorkflowInput
                                name="reference"
                                label={correction ? "Supporting reference" : issue ? "Work order / reference" : "Delivery reference"}
                                placeholder={correction ? "Enter supporting reference" : issue ? "Enter work order or reference" : "Enter delivery reference"}
                                required={!correction}
                                default_value={draft?.reference}
                            />
                            {!correction && (
                                <div className="sm:col-span-2">
                                    <WorkflowInput
                                        name="remarks"
                                        label={issue ? "Purpose" : "Remarks"}
                                        placeholder={issue ? "Enter the reason for this issue" : "Add notes about this receipt (optional)"}
                                        required={issue}
                                        multiline
                                        rows={3}
                                        default_value={draft?.remarks}
                                    />
                                </div>
                            )}
                        </div>
                        {correction ? (
                            <WorkflowNotice>
                                Recorded balance: {selected ? `${balance} ${unit}` : "select a location"}.
                                {selected && counted && Number.isSafeInteger(Number(counted)) && Number(counted) >= 0
                                    ? ` Proposed change: ${format_signed_quantity(Number(counted) - balance)} ${unit}.`
                                    : ""}
                                {" "}A correction would be recorded as a separate adjustment.
                            </WorkflowNotice>
                        ) : (
                            <p className="rounded-md bg-slate-100 p-3 text-xs text-slate-700">
                                {issue ? `An issue deducts stock from the selected location. Available: ${selected ? `${balance} ${unit}` : "select a location"}.` : "A receipt adds stock to the selected location and appears in Stock History."}
                            </p>
                        )}
                    </fieldset>
                    <WorkflowActions label={correction ? "Add correction preview" : issue ? "Review issue" : "Review receipt"} on_cancel={on_close} />
                </form>
            )}
        </FormDialog>
    );
}
