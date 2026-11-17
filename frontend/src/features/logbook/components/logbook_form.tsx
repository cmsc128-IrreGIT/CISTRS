import { ChevronDown, LockKeyhole } from "lucide-react";
import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link } from "react-router";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import { button_styles } from "../../../shared/styles/button_styles";
import { empty_logbook_values, logbook_fields } from "../config/logbook_config";
import type { LogbookEntry, LogbookFormValues } from "../types/logbook_types";
import { logbook_condition, logbook_primary } from "../utils/logbook_entries";

type Props = {
    initial_values?: LogbookEntry;
    recorded_by?: string;
    aircraft_options: { registration: string; model: string }[];
    on_submit: (values: LogbookFormValues) => void;
    cancel_to?: string;
    maintenance_options?: { id: string; aircraft: string; label: string }[];
};

const input_style = "min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8] aria-invalid:border-red-500";
const select_style = `${input_style} appearance-none pr-9`;
const select_icon_style = "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600";
const validation_messages = {
    aircraft: "Select an aircraft.",
    entry_date: "Enter the entry date.",
    entry_time: "Enter the entry time.",
    recorded_condition: "Select the recorded condition.",
    defects: "Describe the observed condition before saving.",
};

export default function LogbookForm({
    initial_values,
    recorded_by,
    aircraft_options,
    on_submit,
    cancel_to = "/logbook",
    maintenance_options = [],
}: Props) {
    const [opened_at] = useState(() => new Date().toISOString());
    const [aircraft, set_aircraft] = useState(initial_values?.aircraft ?? "");
    const [maintenance_id, set_maintenance_id] = useState(initial_values?.maintenance_id ?? "");
    const [errors, set_errors] = useState<Partial<Record<keyof LogbookFormValues, string>>>({});
    const linked_options = maintenance_options.filter((row) => row.aircraft === aircraft);

    function handle_submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const values = empty_logbook_values();
        if (initial_values) {
            for (const { key } of logbook_fields) values[key] = initial_values[key] ?? "";
        }
        for (const key of ["entry_date", "entry_time", "airframe_total_to_date", "defects", "action_taken", "log_page", "maintenance_id"] as const) {
            values[key] = String(data.get(key) ?? "").trim();
        }
        values.aircraft = aircraft;
        const condition = data.get("recorded_condition");
        values.recorded_condition = condition === "No defect reported" || condition === "Defect reported" ? condition : undefined;

        const next_errors: typeof errors = {};
        for (const key of Object.keys(validation_messages) as (keyof typeof validation_messages)[]) {
            if (!values[key]) next_errors[key] = validation_messages[key];
        }
        const hours = form.elements.namedItem("airframe_total_to_date");
        if (hours instanceof HTMLInputElement && !hours.validity.valid) {
            next_errors.airframe_total_to_date = "Enter zero or a positive number of hours.";
        }

        set_errors(next_errors);
        const first_error = Object.keys(next_errors)[0];
        if (first_error) {
            const field = form.elements.namedItem(first_error);
            if (field instanceof HTMLElement) field.focus();
            return;
        }
        on_submit(values);
    }

    return (
        <form noValidate onSubmit={handle_submit} onChange={(event) => {
            const field = event.target;
            if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
            const key = field.name as keyof LogbookFormValues;
            if (errors[key]) set_errors((current) => ({ ...current, [key]: undefined }));
        }}>
            <div className="space-y-4 px-4 py-4 sm:px-5">
                <p className="text-xs text-slate-600"><span className="text-red-700">*</span> indicates a required field.</p>
                <fieldset className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <legend className="mb-3 text-sm font-semibold text-[#0b2238]">Entry identification</legend>
                    <FormField label={initial_values ? "Aircraft · read-only" : "Aircraft"} required={!initial_values} error={errors.aircraft}>
                        {(props) => (
                            <div className="relative">
                                {initial_values ? (
                                    <input {...props} name="aircraft" value={aircraft} readOnly className={`${input_style} pr-9`} />
                                ) : (
                                    <select {...props} name="aircraft" value={aircraft} className={select_style}
                                        onChange={(event) => { set_aircraft(event.currentTarget.value); set_maintenance_id(""); }}>
                                        <option value="">Select aircraft</option>
                                        {aircraft_options.map(({ registration, model }) => (
                                            <option key={registration} value={registration}>{model ? `${registration} · ${model}` : registration}</option>
                                        ))}
                                    </select>
                                )}
                                {initial_values ? <LockKeyhole size={14} className={select_icon_style} aria-hidden="true" /> :
                                    <ChevronDown size={16} className={select_icon_style} aria-hidden="true" />}
                            </div>
                        )}
                    </FormField>
                    <FormField label="Entry date" required error={errors.entry_date}>
                        {(props) => <input {...props} name="entry_date" type="date" className={input_style}
                            defaultValue={initial_values?.entry_date ?? opened_at.slice(0, 10)} />}
                    </FormField>
                    <FormField label="Entry time" required help="Use UTC for the entry date and time." error={errors.entry_time}>
                        {(props) => <input {...props} name="entry_time" type="time" className={input_style}
                            defaultValue={initial_values?.entry_time ?? opened_at.slice(11, 16)} />}
                    </FormField>
                    <FormField label="Aircraft hours" help="Enter the recorded total airframe hours, if available." error={errors.airframe_total_to_date}>
                        {(props) => <input {...props} name="airframe_total_to_date" type="number" min="0" step="any"
                            defaultValue={initial_values?.airframe_total_to_date} placeholder="e.g. 1250.0" className={input_style} />}
                    </FormField>
                    <FormField label="Recorded condition" required help="Select the condition recorded for this entry." error={errors.recorded_condition}>
                        {(props) => (
                            <div className="relative">
                                <select {...props} name="recorded_condition" className={select_style}
                                    defaultValue={initial_values ? logbook_condition(initial_values) : ""}>
                                    <option value="">Select condition</option>
                                    <option>No defect reported</option>
                                    <option>Defect reported</option>
                                </select>
                                <ChevronDown size={16} className={select_icon_style} aria-hidden="true" />
                            </div>
                        )}
                    </FormField>
                    <FormField label="Recorded by · read-only">
                        {(props) => <input {...props} readOnly value={(initial_values ? initial_values.recorded_by : recorded_by) || "Not recorded"} className={input_style} />}
                    </FormField>
                </fieldset>
                <section aria-labelledby="logbook_condition_section" className="space-y-3 border-t border-slate-200 pt-3">
                    <h3 id="logbook_condition_section" className="text-sm font-semibold text-[#0b2238]">Condition &amp; follow-up</h3>
                    <FormField label="Observed condition / defects" required error={errors.defects}>
                        {(props) => <textarea {...props} name="defects" rows={1} maxLength={4000}
                            defaultValue={initial_values?.defects} placeholder="Describe the observed condition" className={`${input_style} resize-y`} />}
                    </FormField>
                    <details className="group">
                        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-[#1d4ed8] [&::-webkit-details-marker]:hidden">
                            Additional information
                            <ChevronDown size={16} aria-hidden="true" className="group-open:rotate-180" />
                        </summary>
                        <div className="mt-3 space-y-3">
                            <FormField label="Maintenance remarks / reference">
                                {(props) => <textarea {...props} name="action_taken" rows={1} maxLength={4000}
                                    defaultValue={initial_values?.action_taken}
                                    placeholder="Optional · link completed work when relevant" className={`${input_style} resize-y`} />}
                            </FormField>
                            <FormField label="Linked maintenance">
                                {(props) => (
                                    <div className="relative">
                                        <select {...props} name="maintenance_id" value={maintenance_id}
                                            onChange={(event) => set_maintenance_id(event.currentTarget.value)} className={select_style}>
                                            <option value="">{aircraft ? "No linked maintenance" : "Select an aircraft first"}</option>
                                            {maintenance_id && !linked_options.some((row) => row.id === maintenance_id) && (
                                                <option value={maintenance_id}>Existing linked record unavailable</option>
                                            )}
                                            {linked_options.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
                                        </select>
                                        <ChevronDown size={16} className={select_icon_style} aria-hidden="true" />
                                    </div>
                                )}
                            </FormField>
                            <FormField label="Paper log page">
                                {(props) => <input {...props} name="log_page" maxLength={200} defaultValue={initial_values?.log_page}
                                    placeholder="Enter a paper log reference (optional)" className={input_style} />}
                            </FormField>
                        </div>
                    </details>
                </section>
            </div>
            <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
                <Link to={cancel_to} className={button_styles("secondary")}>Cancel</Link>
                <Button type="submit" className={`min-w-28 ${logbook_primary}`}>Save</Button>
            </div>
        </form>
    );
}
