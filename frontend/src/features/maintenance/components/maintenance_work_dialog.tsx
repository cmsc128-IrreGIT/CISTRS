import { useState } from "react";
import type { SubmitEvent } from "react";
import Button from "../../../shared/components/ui/button";
import DetailsList from "../../../shared/components/ui/details_list";
import FormDialog from "../../../shared/components/ui/form_dialog";
import FormField from "../../../shared/components/forms/form_field";
import type { PreviewRecord } from "../../../shared/types/record_types";
import useInventoryHistory from "../../inventory/hooks/use_inventory_history";
import {
    maintenance_work_fields,
    maintenance_work_order_field,
    maintenance_work_types,
} from "../config/maintenance_config";
import { format_work_date, linked_stock_note, work_button_style } from "../utils/maintenance_work";

const input_style = "min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8]";

function WorkSummary({ record }: { record: Omit<PreviewRecord, "id"> }) {
    return (
        <div className="space-y-4">
            <div className="rounded-lg bg-slate-100 p-4">
                <h3 className="mb-3 font-semibold text-[#0b2238]">Work record</h3>
                <DetailsList entries={[
                    { id: "aircraft", label: "Aircraft", value: record.aircraft || "Not recorded" },
                    { id: "order", label: "Work order", value: record.work_order || "Not recorded" },
                    { id: "type", label: "Work type", value: record.work_type || record.title || "Not recorded" },
                    { id: "date", label: "Date performed", value: format_work_date(record.performed_date) },
                    { id: "performer", label: "Performed by", value: record.performed_by || "Not recorded" },
                    { id: "hours", label: "Aircraft hours", value: record.aircraft_hours ? `${Number(record.aircraft_hours).toLocaleString("en-GB", { maximumFractionDigits: 1 })} h` : "Not recorded" },
                    { id: "work", label: "Work performed", value: record.description || record.notes || record.title || "Not recorded" },
                ]} />
            </div>
            {record.issue_reference && (
                <div className="rounded-lg bg-slate-100 p-4">
                    <h3 className="mb-3 font-semibold text-[#0b2238]">Linked parts</h3>
                    <DetailsList entries={[
                        { id: "reference", label: "Issued stock reference", value: record.issue_reference },
                        { id: "part", label: "Part used", value: record.part_used },
                    ]} />
                    <p className="mt-4 text-sm text-slate-600">{linked_stock_note}</p>
                </div>
            )}
        </div>
    );
}

export function MaintenanceWorkDetails({ record, on_close }: { record: PreviewRecord; on_close: () => void }) {
    return (
        <FormDialog title="Maintenance record details" compact on_close={on_close}>
            <div className="space-y-4 p-4 sm:p-5">
                {record.work_order && <p className="text-sm font-semibold text-slate-700">{record.work_order}</p>}
                <WorkSummary record={record} />
            </div>
            <div className="flex justify-end border-t border-slate-200 p-4 sm:px-5">
                <Button className={work_button_style} onClick={on_close}>Close</Button>
            </div>
        </FormDialog>
    );
}

export function MaintenanceWorkDialog({
    aircraft_options, fixed_aircraft, on_close, on_save,
}: {
    aircraft_options: string[];
    fixed_aircraft?: string;
    on_close: () => void;
    on_save: (record: Omit<PreviewRecord, "id">) => void;
}) {
    const { history, is_loading, error: history_error } = useInventoryHistory();
    const [draft, set_draft] = useState<Omit<PreviewRecord, "id">>();
    const [aircraft, set_aircraft] = useState(fixed_aircraft ?? "");
    const [issue_id, set_issue_id] = useState("");
    const [review, set_review] = useState(false);
    const [error, set_error] = useState("");
    const issued = history.filter((row) =>
        row.transaction_type === "ISSUE" && row.quantity_change < 0 &&
        row.reference?.trim() && aircraft && row.aircraft?.trim().toUpperCase() === aircraft.toUpperCase()
    );
    const issue = issued.find((row) => row.transaction_UUID === issue_id);

    function review_work(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const read = (name: string) => String(data.get(name) ?? "").trim();
        const description = read("description");
        const performed_by = read("performed_by");
        const work_order = read("work_order");
        if (!description || !performed_by || !work_order) {
            set_error("Enter the work order, performer, and description.");
            return;
        }
        const part = issue?.status.part;
        const part_used = issue && part ? `${part.part_name} · ${Math.abs(issue.quantity_change)} ${part.unit_of_measure || ""}`.trim() : "";
        set_draft({
            aircraft,
            work_order,
            work_type: read("work_type"),
            performed_date: read("performed_date"),
            performed_by,
            aircraft_hours: read("aircraft_hours"),
            description,
            title: read("work_type"),
            status: "Completed",
            notes: description,
            part_number: part?.part_number ?? "",
            issue_reference: issue?.reference?.trim() ?? "",
            part_used,
            issue_id: issue?.transaction_UUID ?? "",
        });
        set_error("");
        set_review(true);
    }

    function save_work(record: Omit<PreviewRecord, "id">) {
        try {
            on_save(record);
        } catch (cause) {
            set_error(cause instanceof Error ? cause.message : "Could not save the work record.");
        }
    }

    return (
        <FormDialog title={review ? "Review maintenance work" : "Record maintenance work"} on_close={on_close}>
            {review && draft ? (
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Step 2 of 2 · Check the work and linked parts before saving. Preview records reset when you reload the app.</p>
                    <WorkSummary record={draft} />
                    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
                        <Button variant="secondary" onClick={() => { set_error(""); set_review(false); }}>Back to edit</Button>
                        <Button className={work_button_style} onClick={() => save_work(draft)}>Save record</Button>
                    </div>
                </div>
            ) : (
                <form className="space-y-4" onSubmit={review_work}>
                    <p className="text-sm text-slate-600"><span className="text-red-700">*</span> indicates a required field.</p>
                    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <FormField label={fixed_aircraft ? "Aircraft · read-only" : "Aircraft"} required={!fixed_aircraft}>
                            {(props) => fixed_aircraft ? (
                                <input {...props} readOnly value={fixed_aircraft} className={`${input_style} bg-slate-50`} />
                            ) : (
                                <select {...props} className={input_style} value={aircraft}
                                    onChange={(event) => { set_aircraft(event.currentTarget.value); set_issue_id(""); }}>
                                    <option value="">Select an aircraft</option>
                                    {aircraft_options.map((registration) => <option key={registration}>{registration}</option>)}
                                </select>
                            )}
                        </FormField>
                        <FormField label={maintenance_work_order_field.label} required help={maintenance_work_order_field.help}>
                            {(props) => <input {...props} name={maintenance_work_order_field.name} placeholder={maintenance_work_order_field.placeholder} defaultValue={draft?.work_order} maxLength={100} className={input_style} />}
                        </FormField>
                        <FormField label="Work type" required>
                            {(props) => (
                                <select {...props} name="work_type" defaultValue={draft?.work_type ?? ""} className={input_style}>
                                    <option value="">Select a work type</option>
                                    {maintenance_work_types.map((type) => <option key={type}>{type}</option>)}
                                </select>
                            )}
                        </FormField>
                        {maintenance_work_fields.map((field) => (
                            <FormField key={field.name} label={field.label} required={field.required} help={field.help}>
                                {(props) => <input {...props} name={field.name} type={field.type ?? "text"}
                                    min={field.type === "number" ? 0 : undefined}
                                    step={field.type === "number" ? "0.1" : undefined}
                                    defaultValue={draft?.[field.name]} placeholder={field.placeholder} maxLength={120} className={input_style} />}
                            </FormField>
                        ))}
                        <div className="sm:col-span-2">
                            <FormField label="Description of work" required>
                                {(props) => <textarea {...props} name="description" rows={2} maxLength={2000}
                                    defaultValue={draft?.description} placeholder="Describe the work performed" className={`${input_style} resize-y`} />}
                            </FormField>
                        </div>
                    </div>
                    <section aria-labelledby="maintenance_parts_title" className="space-y-3 border-t border-slate-200 pt-3">
                        <h3 id="maintenance_parts_title" className="font-semibold text-[#0b2238]">Parts used</h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <FormField label="Issued stock reference" help="Optional. Link a recorded issue for this aircraft.">
                                {(props) => (
                                    <select {...props} value={issue?.transaction_UUID ?? ""} className={input_style}
                                        disabled={!aircraft || is_loading || !!history_error}
                                        onChange={(event) => set_issue_id(event.currentTarget.value)}>
                                        <option value="">{!aircraft ? "Select an aircraft first" : is_loading ? "Loading issued stock…" : history_error ? "Issued stock unavailable" : issued.length ? "Select an issued stock reference" : "No issued stock recorded"}</option>
                                        {issued.map((row) => <option key={row.transaction_UUID} value={row.transaction_UUID}>
                                            {row.reference} · {row.status.part.part_name} ×{Math.abs(row.quantity_change)}
                                        </option>)}
                                    </select>
                                )}
                            </FormField>
                            <FormField label="Stock handling">
                                {(props) => <input {...props} readOnly className={`${input_style} bg-slate-50`}
                                    value={issue ? "Already issued · link only" : "No linked stock issue"} />}
                            </FormField>
                        </div>
                    </section>
                    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
                        <Button variant="secondary" className="mr-auto" onClick={on_close}>Cancel</Button>
                        <Button type="submit" className={work_button_style}>Review</Button>
                    </div>
                </form>
            )}
        </FormDialog>
    );
}
