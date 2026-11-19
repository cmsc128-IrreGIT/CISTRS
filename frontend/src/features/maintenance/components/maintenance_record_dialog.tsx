import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";
import FormField from "../../../shared/components/forms/form_field";
import FormDialog from "../../../shared/components/ui/form_dialog";
import Button from "../../../shared/components/ui/button";
import DetailsList from "../../../shared/components/ui/details_list";
import StatusBadge from "../../../shared/components/ui/status_badge";
import { employee_name } from "../../../shared/utils/employee_name";
import { api } from "../../../shared/api/client";
import { maintenance_service } from "../services/maintenance_service";
import { INVENTORY_FORM_INPUT } from "../../inventory/constants/inventory_form_constants";
import { maintenance_id } from "../types/maintenance_types";
import type { MaintenanceAircraft, MaintenanceEmployee, MaintenanceKind, MaintenanceRecord } from "../types/maintenance_types";

type Field = { name: string; label: string; required?: boolean; type?: string; max?: number; multiline?: boolean };
const ad_fields: Field[] = [
    { name: "faa_ad_number", label: "FAA AD number", required: true, max: 50 },
    { name: "subject", label: "Subject", required: true, max: 300 },
    { name: "ad_category", label: "AD category", required: true, max: 100 },
    { name: "effective_date", label: "Effective date", required: true, type: "date" },
    { name: "compliance_method", label: "Compliance method", required: true, max: 1000 },
    { name: "mechanic_license_number", label: "Mechanic license number", required: true, max: 50 },
    { name: "amendment_number", label: "Amendment number", max: 50 },
    { name: "frequency", label: "Frequency", max: 100 },
    { name: "date_of_compliance", label: "Date of compliance", type: "date" },
    { name: "next_due_date", label: "Next due date", type: "date" },
    { name: "next_due_hours", label: "Next due hours", type: "number" },
    { name: "pdf_link", label: "PDF link", type: "url", max: 500 },
    { name: "remarks", label: "Remarks", max: 1000, multiline: true },
];
const cpcp_fields: Field[] = [
    { name: "task_reference", label: "Task reference", required: true, max: 100 },
    { name: "description", label: "Description", max: 1000, multiline: true },
    { name: "due_date", label: "Due date", type: "date" },
    { name: "due_hours", label: "Due hours", type: "number" },
    { name: "last_accomplished_date", label: "Last accomplished date", type: "date" },
    { name: "remarks", label: "Remarks", max: 1000, multiline: true },
];

export default function MaintenanceRecordDialog({ kind, record, aircraft, view = false, on_close, on_saved }: {
    kind: MaintenanceKind; record?: MaintenanceRecord; aircraft: MaintenanceAircraft[];
    view?: boolean; on_close: () => void; on_saved: () => void;
}) {
    const [editing, set_editing] = useState(!view);
    const [employees, set_employees] = useState<MaintenanceEmployee[]>([]);
    const [loading, set_loading] = useState(true);
    const [error, set_error] = useState("");
    const [saving, set_saving] = useState(false);
    const fields = kind === "ad" ? ad_fields : cpcp_fields;
    const main_form_field = (field: Field) => kind === "cpcp" || field.required || field.name === "next_due_date" || field.name === "next_due_hours";
    const selected_employee = record ? ("ad_UUID" in record ? record.mechanic : record.assignee) : undefined;
    useEffect(() => {
        const controller = new AbortController();
        api<MaintenanceEmployee[]>("/personnel/directory", { signal: controller.signal })
            .then((rows) => {
                if (!controller.signal.aborted) set_employees(selected_employee && !rows.some((row) => row.emp_UUID === selected_employee.emp_UUID) ? [...rows, selected_employee] : rows);
            })
            .catch((cause: unknown) => { if (!controller.signal.aborted) set_error(cause instanceof Error ? cause.message : "Could not load employees."); })
            .finally(() => { if (!controller.signal.aborted) set_loading(false); });
        return () => controller.abort();
    }, [selected_employee]);
    const current = (name: string) => record && name in record ? String((record as unknown as Record<string, unknown>)[name] ?? "") : "";
    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (saving) return;
        const data = new FormData(event.currentTarget);
        const payload: Record<string, string | number | null> = {};
        for (const field of fields) {
            const value = String(data.get(field.name) ?? "").trim();
            payload[field.name] = value ? field.type === "number" ? Number(value) : value : null;
        }
        payload[kind === "ad" ? "mechanic_emp_UUID" : "assigned_to"] = String(data.get("employee"));
        if (!record) payload.aircraft_UUID = String(data.get("aircraft_UUID"));
        set_saving(true);
        set_error("");
        try {
            await maintenance_service.save_record(kind, payload, record ? maintenance_id(record) : undefined);
            toast.success("Maintenance record saved", { position: "bottom-right" });
            on_saved();
        } catch (cause) { set_error(cause instanceof Error ? cause.message : "Could not save maintenance."); }
        finally { set_saving(false); }
    }
    const field_control = (field: Field) => <div key={field.name} className={field.multiline ? "sm:col-span-2" : undefined}>
        <FormField label={field.label} required={field.required}>
            {(props) => field.multiline
                ? <textarea {...props} name={field.name} required={field.required} maxLength={field.max} rows={3} defaultValue={current(field.name)} className={`${INVENTORY_FORM_INPUT} ${field.name === "remarks" ? "resize-y" : "resize-none"}`} />
                : <input {...props} name={field.name} required={field.required} maxLength={field.max} type={field.type ?? "text"} min={field.type === "number" ? 0 : undefined} step={field.type === "number" ? "0.01" : undefined} defaultValue={current(field.name)} className={INVENTORY_FORM_INPUT} />}
        </FormField>
    </div>;
    return <FormDialog title={`${editing ? record ? "Edit" : "Add" : "View"} ${kind === "ad" ? "AD record" : "CPCP task"}`} compact on_close={on_close} is_busy={saving}>
        {!editing && record ? <>
            <div className="space-y-4 p-4 sm:px-5">
                <DetailsList entries={[
                    { id: "aircraft", label: "Aircraft", value: record.aircraft.registration },
                    { id: "status", label: "Due status", value: <StatusBadge tone={record.overdue ? "danger" : record.due_status === "Current" ? "success" : "neutral"}>{record.due_status}</StatusBadge> },
                    { id: "employee", label: kind === "ad" ? "Mechanic" : "Assigned to", value: selected_employee ? employee_name(selected_employee) : "Not recorded" },
                    ...fields.filter((field) => kind !== "ad" || field.required).map((field) => ({ id: field.name, label: field.label, value: current(field.name) || "Not recorded" })),
                ]} />
                <DetailsList entries={[
                    { id: "days", label: "Days until due", value: record.days_until_due ?? "Not scheduled" },
                    { id: "hours", label: "Hours until due", value: record.hours_until_due ?? "Not scheduled" },
                ]} />
                {kind === "ad" && <details className="group border-t border-slate-200">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">Additional Information<ChevronDown size={16} aria-hidden="true" className="group-open:rotate-180" /></summary>
                    <DetailsList entries={fields.filter((field) => !field.required).map((field) => ({ id: field.name, label: field.label, value: current(field.name) || "Not recorded" }))} />
                </details>}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-4"><Button variant="secondary" onClick={on_close}>Close</Button><Button onClick={() => set_editing(true)}>Edit</Button></div>
        </> : <form onSubmit={submit}>
            <div className="space-y-4 p-4 sm:px-5">
                <p className="text-xs text-slate-600"><span className="text-red-700">*</span> indicates a required field.</p>
                {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
                <fieldset disabled={saving} className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <legend className="sr-only">Maintenance information</legend>
                    <FormField label="Aircraft" required>
                        {(props) => record ? <input {...props} readOnly value={record.aircraft.registration} className={INVENTORY_FORM_INPUT} /> : <select {...props} required name="aircraft_UUID" className={INVENTORY_FORM_INPUT}>
                            <option value="">Select aircraft</option>{aircraft.map((row) => <option key={row.aircraft_UUID} value={row.aircraft_UUID}>{row.registration}</option>)}
                        </select>}
                    </FormField>
                    <FormField label={kind === "ad" ? "Mechanic" : "Assigned to"} required>
                        {(props) => <select {...props} required disabled={loading} name="employee" defaultValue={selected_employee?.emp_UUID ?? ""} className={INVENTORY_FORM_INPUT}>
                            <option value="">{loading ? "Loading employees..." : "Select employee"}</option>{employees.map((row) => <option key={row.emp_UUID} value={row.emp_UUID}>{employee_name(row)} ({row.emp_number})</option>)}
                        </select>}
                    </FormField>
                    {fields.filter(main_form_field).map(field_control)}
                </fieldset>
                {kind === "ad" && <details className="group border-t border-slate-200">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">Additional Information<ChevronDown size={16} className="group-open:rotate-180" /></summary>
                    <fieldset disabled={saving} className="grid min-w-0 gap-3 sm:grid-cols-2"><legend className="sr-only">Optional information</legend>{fields.filter((field) => !main_form_field(field)).map(field_control)}</fieldset>
                </details>}
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4 sm:px-5">
                <Button type="button" variant="secondary" disabled={saving} onClick={on_close}>Cancel</Button>
                <Button type="submit" disabled={loading || !employees.length || (!record && !aircraft.length)} is_loading={saving}>Save</Button>
            </div>
        </form>}
    </FormDialog>;
}
