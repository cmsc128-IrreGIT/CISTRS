import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router";
import { api } from "../../../shared/api/client";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import { INVENTORY_FORM_INPUT } from "../../inventory/constants/inventory_form_constants";
import type { PersonnelEmployeeResponse } from "../../personnel/types/personnel_types";
import type { LogbookEntry, LogbookEmployee, LogbookFormValues, LogbookFuelDraft, LogbookFuelInput, LogbookAircraft, LogbookReference, LogbookSectorInput } from "../types/logbook_types";
import { empty_logbook_values } from "../config/logbook_config";
import { employee_name, logbook_primary } from "../utils/logbook_entries";

type Props = {
    initial_values?: LogbookEntry;
    aircraft_options: LogbookAircraft[];
    flight_status_options: LogbookReference[];
    flight_type_options: LogbookReference[];
    delay_category_options: LogbookReference[];
    lookup_error?: string;
    on_submit: (values: LogbookSectorInput) => Promise<void>;
    cancel_to?: string;
};

function to_input_parts(value: string | null) {
    if (!value) return { date: "", time: "", period: "AM" };
    const utc = new Date(value).toISOString();
    const hour = Number(utc.slice(11, 13));
    return {
        date: utc.slice(0, 10),
        time: `${String(hour % 12 || 12).padStart(2, "0")}:${utc.slice(14, 16)}`,
        period: hour >= 12 ? "PM" : "AM",
    };
}

function to_api_time(date: string, time: string, period: string) {
    if (!date && !time) return null;
    if (!date || !time || !period || !/^\d{1,2}:\d{2}$/.test(time)) {
        throw new Error("Enter both a date and a time for each flight event.");
    }
    const [hour_text, minute_text] = time.split(":");
    const hour = Number(hour_text);
    const minute = Number(minute_text);
    if (hour < 1 || hour > 12 || minute > 59 || !["AM", "PM"].includes(period)) {
        throw new Error("Enter a valid time in 12-hour format, such as 09:30 AM.");
    }
    const hour_24 = (hour % 12) + (period === "PM" ? 12 : 0);
    return new Date(`${date}T${String(hour_24).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`).toISOString();
}

function as_number(value: string) {
    return value.trim() ? Number(value) : null;
}

function to_employee(value: PersonnelEmployeeResponse): LogbookEmployee {
    return { emp_UUID: value.emp_UUID, emp_number: value.emp_number, f_name: value.f_name, l_name: value.l_name };
}

export default function LogbookForm({
    initial_values,
    aircraft_options,
    flight_status_options,
    flight_type_options,
    delay_category_options,
    lookup_error,
    on_submit,
    cancel_to = "/logbook",
}: Props) {
    const [employees, set_employees] = useState<LogbookEmployee[]>([]);
    const [loading_employees, set_loading_employees] = useState(true);
    const [saving, set_saving] = useState(false);
    const [error, set_error] = useState("");
    const [fuel_rows, set_fuel_rows] = useState<number[]>([]);
    const [fuel_drafts, set_fuel_drafts] = useState<Record<number, LogbookFuelDraft>>({});
    const [values, set_values] = useState<LogbookFormValues>(() => ({
        ...empty_logbook_values(),
        ...(initial_values ? {
            aircraft_UUID: initial_values.aircraft.aircraft_UUID,
            flight_status_UUID: initial_values.flight_status.flight_status_UUID,
            flight_type_UUID: initial_values.flight_type.flight_type_UUID,
            pic_emp_UUID: initial_values.pic.emp_UUID,
            flight_date: initial_values.flight_date,
            route: initial_values.route,
            sic_emp_UUID: initial_values.sic?.emp_UUID ?? "",
            observer_emp_UUID: initial_values.observer?.emp_UUID ?? "",
            delay_category_UUID: initial_values.delay_category?.delay_category_UUID ?? "",
            std: initial_values.std ?? "",
            sta: initial_values.sta ?? "",
            off_block: initial_values.off_block ?? "",
            airborne: initial_values.airborne ?? "",
            touchdown: initial_values.touchdown ?? "",
            on_block: initial_values.on_block ?? "",
            flight_time: initial_values.flight_time === null ? "" : String(initial_values.flight_time),
            day_night: initial_values.day_night ?? "",
            pax_count: String(initial_values.pax_count),
            fuel_departure: initial_values.fuel_departure === null ? "" : String(initial_values.fuel_departure),
            fuel_arrival: initial_values.fuel_arrival === null ? "" : String(initial_values.fuel_arrival),
            fuel_used: initial_values.fuel_used === null ? "" : String(initial_values.fuel_used),
            fuel_unit: initial_values.fuel_unit ?? "",
            delay_cause: initial_values.delay_cause ?? "",
            qa_check_status: initial_values.qa_check_status ?? "",
        } : {}),
    }));

    useEffect(() => {
        let active = true;
        api<PersonnelEmployeeResponse[]>("/personnel/directory")
            .then((rows) => { if (active) set_employees(rows.map(to_employee)); })
            .catch((cause: unknown) => { if (active) set_error(cause instanceof Error ? cause.message : "Could not load active crew members."); })
            .finally(() => { if (active) set_loading_employees(false); });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!initial_values) return;
        set_employees((rows) => {
            const current = [initial_values.pic, initial_values.sic, initial_values.observer].filter((row): row is LogbookEmployee => Boolean(row));
            return [...rows, ...current.filter((candidate) => !rows.some((row) => row.emp_UUID === candidate.emp_UUID))];
        });
    }, [initial_values]);

    function set_value(key: keyof LogbookFormValues, value: string) {
        set_values((current) => ({ ...current, [key]: value }));
    }

    function add_fuel_entry() {
        const next = fuel_rows.length ? Math.max(...fuel_rows) + 1 : 0;
        set_fuel_rows((rows) => [...rows, next]);
        set_fuel_drafts((rows) => ({
            ...rows,
            [next]: { issued_to: "", transaction_date: values.flight_date, transaction_type: "", quantity_gal: "", remarks: "" },
        }));
    }

    function change_fuel(index: number, key: keyof LogbookFuelDraft, value: string) {
        set_fuel_drafts((rows) => ({ ...rows, [index]: { ...rows[index], [key]: value } }));
    }

    async function handle_submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        set_error("");
        const form_data = new FormData(event.currentTarget);
        const read = (name: string) => String(form_data.get(name) ?? "").trim();
        let payload: LogbookSectorInput;
        try {
        payload = {
            aircraft_UUID: read("aircraft_UUID"),
            flight_status_UUID: read("flight_status_UUID"),
            flight_type_UUID: read("flight_type_UUID"),
            pic_emp_UUID: read("pic_emp_UUID"),
            flight_date: read("flight_date"),
            route: read("route"),
            sic_emp_UUID: read("sic_emp_UUID") || null,
            observer_emp_UUID: read("observer_emp_UUID") || null,
            delay_category_UUID: read("delay_category_UUID") || null,
            std: to_api_time(read("std_date"), read("std_time"), read("std_period")),
            sta: to_api_time(read("sta_date"), read("sta_time"), read("sta_period")),
            off_block: to_api_time(read("off_block_date"), read("off_block_time"), read("off_block_period")),
            airborne: to_api_time(read("airborne_date"), read("airborne_time"), read("airborne_period")),
            touchdown: to_api_time(read("touchdown_date"), read("touchdown_time"), read("touchdown_period")),
            on_block: to_api_time(read("on_block_date"), read("on_block_time"), read("on_block_period")),
            flight_time: as_number(read("flight_time")),
            day_night: (read("day_night") || null) as "Day" | "Night" | null,
            pax_count: Number(read("pax_count") || 0),
            fuel_departure: as_number(read("fuel_departure")),
            fuel_arrival: as_number(read("fuel_arrival")),
            fuel_used: as_number(read("fuel_used")),
            fuel_unit: read("fuel_unit") || null,
            delay_cause: read("delay_cause") || null,
            qa_check_status: read("qa_check_status") || null,
        };
        } catch (cause) {
            set_error(cause instanceof Error ? cause.message : "Enter valid flight dates and times.");
            return;
        }

        const incomplete_fuel = fuel_rows.some((index) => {
            const row = fuel_drafts[index];
            return !row?.issued_to || !row.transaction_date || !row.transaction_type.trim() ||
                !row.quantity_gal || !Number.isFinite(Number(row.quantity_gal)) || Number(row.quantity_gal) <= 0;
        });
        if (incomplete_fuel) {
            set_error("Complete each fuel entry or remove the empty row.");
            return;
        }
        if (!initial_values && fuel_rows.length) {
            payload.fuel_transactions = fuel_rows.map((index) => {
                const row = fuel_drafts[index];
                return {
                    issued_to: row.issued_to,
                    transaction_date: row.transaction_date,
                    transaction_type: row.transaction_type.trim(),
                    quantity_gal: Number(row.quantity_gal),
                    remarks: row.remarks.trim() || null,
                } satisfies LogbookFuelInput;
            });
        }

        if (!flight_status_options.length || !flight_type_options.length) {
            set_error("Flight status and type options are not available. The backend needs to provide lookup data or an existing logbook entry.");
            return;
        }
        set_saving(true);
        try {
            await on_submit(payload);
        } catch (cause) {
            set_error(cause instanceof Error ? cause.message : "Could not save the logbook entry.");
        } finally {
            set_saving(false);
        }
    }

    const employee_control = (name: keyof LogbookFormValues, label: string, required = false, exclude: string[] = []) => (
        <FormField label={label} required={required}>
            {(props) => <select {...props} name={name} required={required} disabled={loading_employees || saving} value={values[name] as string} onChange={(event) => set_value(name, event.currentTarget.value)} className={INVENTORY_FORM_INPUT}>
                <option value="">{loading_employees ? "Loading active employees…" : "Select an employee"}</option>
                {employees.filter((row) => !exclude.includes(row.emp_UUID) || row.emp_UUID === values[name]).map((row) => <option key={row.emp_UUID} value={row.emp_UUID}>{employee_name(row)} ({row.emp_number})</option>)}
            </select>}
        </FormField>
    );

    const select_control = (name: keyof LogbookFormValues, label: string, options: LogbookReference[], required = false) => (
        <FormField label={label} required={required}>
            {(props) => <div className="relative">
                <select {...props} name={name} required={required} value={values[name] as string} onChange={(event) => set_value(name, event.currentTarget.value)} className={`${INVENTORY_FORM_INPUT} appearance-none pr-9`}>
                    <option value="">Select {label.toLowerCase()}</option>
                    {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-600" aria-hidden="true" />
            </div>}
        </FormField>
    );

    const text_control = (name: keyof LogbookFormValues, label: string, type = "text", required = false, wide = false, multiline = false) => (
        <div className={wide ? "sm:col-span-2" : undefined} key={name}>
            <FormField label={label} required={required}>
                {(props) => multiline ? <textarea {...props} name={name} required={required} rows={3} maxLength={type === "text" ? 500 : undefined} value={values[name] as string} onChange={(event) => set_value(name, event.currentTarget.value)} className={`${INVENTORY_FORM_INPUT} resize-y`} /> : (
                    <input {...props} name={name} type={type} required={required} min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined} value={values[name] as string} onChange={(event) => set_value(name, event.currentTarget.value)} className={INVENTORY_FORM_INPUT} />
                )}
            </FormField>
        </div>
    );

    const flight_datetime_control = (name: "std" | "sta" | "off_block" | "airborne" | "touchdown" | "on_block", label: string) => {
        const parts = to_input_parts(values[name] || null);
        return <div key={name} className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
            <FormField label={`${label} Date`}>
                {(props) => <input {...props} name={`${name}_date`} type="date" defaultValue={parts.date} className={INVENTORY_FORM_INPUT} />}
            </FormField>
            <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
                <FormField label={`${label} Time`}>
                    {(props) => <input {...props} name={`${name}_time`} type="text" inputMode="numeric" placeholder="HH:MM" pattern="(0?[1-9]|1[0-2]):[0-5][0-9]" maxLength={5} defaultValue={parts.time} className={INVENTORY_FORM_INPUT} />}
                </FormField>
                <FormField label="AM/PM">
                    {(props) => <select {...props} name={`${name}_period`} defaultValue={parts.period} className={INVENTORY_FORM_INPUT}><option value="AM">AM</option><option value="PM">PM</option></select>}
                </FormField>
            </div>
        </div>;
    };

    const has_lookup_options = flight_status_options.length > 0 && flight_type_options.length > 0;
    const additional = (children: ReactNode) => <details className="group border-t border-slate-200">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded text-sm font-semibold text-[#0b2238] focus-visible:outline-2 focus-visible:outline-[#1d4ed8] [&::-webkit-details-marker]:hidden">
            Additional Flight Information <ChevronDown size={16} className="group-open:rotate-180" aria-hidden="true" />
        </summary>
        <fieldset disabled={saving} className="grid min-w-0 gap-3 pb-2 sm:grid-cols-2"><legend className="sr-only">Additional information</legend>{children}</fieldset>
    </details>;

    return (
        <form onSubmit={handle_submit}>
            <div className="space-y-4 px-4 py-4 sm:px-5">
                <p className="text-xs text-slate-600"><span className="text-red-700">*</span> indicates a required field.</p>
                {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
                {lookup_error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">Could not load flight lookup options: {lookup_error}</p>}
                {!lookup_error && !has_lookup_options && <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">No flight status or type options were returned by the lookup service.</p>}
                {!aircraft_options.length && <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">No aircraft are available. Your account may not have access to the aircraft list.</p>}
                <fieldset disabled={saving} className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <legend className="mb-3 text-sm font-semibold text-slate-900">General Flight Details</legend>
                    <FormField label="Aircraft" required>
                        {(props) => <select {...props} name="aircraft_UUID" required value={values.aircraft_UUID} onChange={(event) => set_value("aircraft_UUID", event.currentTarget.value)} className={INVENTORY_FORM_INPUT}>
                            <option value="">Select aircraft</option>
                            {aircraft_options.map((row) => <option key={row.aircraft_UUID} value={row.aircraft_UUID}>{row.registration}</option>)}
                        </select>}
                    </FormField>
                    {text_control("flight_date", "Flight date", "date", true)}
                    {text_control("route", "Route", "text", true)}
                    {select_control("flight_status_UUID", "Flight status", flight_status_options, true)}
                    {select_control("flight_type_UUID", "Flight type", flight_type_options, true)}
                    {employee_control("pic_emp_UUID", "Pilot in command", true)}
                    {employee_control("sic_emp_UUID", "Second in command", false, [values.pic_emp_UUID])}
                    {employee_control("observer_emp_UUID", "Observer", false, [values.pic_emp_UUID, values.sic_emp_UUID])}
                </fieldset>

                {additional(<>
                    {select_control("delay_category_UUID", "Delay category", delay_category_options)}
                    <FormField label="Day or night">
                        {(props) => <select {...props} name="day_night" value={values.day_night} onChange={(event) => set_value("day_night", event.currentTarget.value)} className={INVENTORY_FORM_INPUT}>
                            <option value="">Not recorded</option><option value="Day">Day</option><option value="Night">Night</option>
                        </select>}
                    </FormField>
                    {flight_datetime_control("std", "STD")}
                    {flight_datetime_control("sta", "STA")}
                    {flight_datetime_control("off_block", "Off-block")}
                    {flight_datetime_control("airborne", "Airborne")}
                    {flight_datetime_control("touchdown", "Touchdown")}
                    {flight_datetime_control("on_block", "On-block")}
                    {text_control("flight_time", "Flight time (hours)", "number")}
                    {text_control("pax_count", "Passenger count", "number")}
                    {text_control("fuel_departure", "Fuel at departure", "number")}
                    {text_control("fuel_arrival", "Fuel at arrival", "number")}
                    {text_control("fuel_used", "Fuel used", "number")}
                    {text_control("fuel_unit", "Fuel unit")}
                    {text_control("delay_cause", "Delay cause", "text", false, true, true)}
                    {text_control("qa_check_status", "QA check status")}
                </>)}
                {!initial_values && <section aria-labelledby="fuel_transactions_heading" className="space-y-3 border-t border-slate-200 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 id="fuel_transactions_heading" className="text-sm font-semibold text-slate-900">Fuel Transactions</h3>
                        <Button type="button" variant="secondary" onClick={add_fuel_entry}><Plus size={15} aria-hidden="true" /> Add Fuel Entry</Button>
                    </div>
                    {fuel_rows.map((index) => {
                        const row = fuel_drafts[index];
                        return <fieldset key={index} className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-2">
                            <legend className="sr-only">Fuel entry {index + 1}</legend>
                            <FormField label="Issued to" required>
                                {(props) => <select {...props} required disabled={loading_employees || saving} value={row?.issued_to ?? ""} onChange={(event) => change_fuel(index, "issued_to", event.currentTarget.value)} className={INVENTORY_FORM_INPUT}>
                                    <option value="">{loading_employees ? "Loading employees..." : "Select an employee"}</option>
                                    {employees.map((employee) => <option key={employee.emp_UUID} value={employee.emp_UUID}>{employee_name(employee)} ({employee.emp_number})</option>)}
                                </select>}
                            </FormField>
                            <FormField label="Transaction date" required>
                                {(props) => <input {...props} type="date" required disabled={saving} value={row?.transaction_date ?? ""} onChange={(event) => change_fuel(index, "transaction_date", event.currentTarget.value)} className={INVENTORY_FORM_INPUT} />}
                            </FormField>
                            <FormField label="Transaction type" required>
                                {(props) => <input {...props} required maxLength={50} disabled={saving} value={row?.transaction_type ?? ""} onChange={(event) => change_fuel(index, "transaction_type", event.currentTarget.value)} className={INVENTORY_FORM_INPUT} />}
                            </FormField>
                            <FormField label="Quantity (gal)" required>
                                {(props) => <input {...props} type="number" min="0.01" step="0.01" required disabled={saving} value={row?.quantity_gal ?? ""} onChange={(event) => change_fuel(index, "quantity_gal", event.currentTarget.value)} className={INVENTORY_FORM_INPUT} />}
                            </FormField>
                            <div className="sm:col-span-2">
                                <FormField label="Remarks">
                                    {(props) => <textarea {...props} rows={2} maxLength={500} disabled={saving} value={row?.remarks ?? ""} onChange={(event) => change_fuel(index, "remarks", event.currentTarget.value)} className={`${INVENTORY_FORM_INPUT} resize-y`} />}
                                </FormField>
                            </div>
                            <div className="sm:col-span-2 flex justify-end">
                                <Button type="button" variant="ghost" disabled={saving} onClick={() => set_fuel_rows((rows) => rows.filter((item) => item !== index))}>Cancel Fuel Entry</Button>
                            </div>
                        </fieldset>;
                    })}
                </section>}
            </div>
            <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
                <Link to={cancel_to} className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Cancel</Link>
                <Button type="submit" is_loading={saving} disabled={loading_employees || !has_lookup_options || !aircraft_options.length} className={`min-w-28 ${logbook_primary}`}>{initial_values ? "Update entry" : "Save entry"}</Button>
            </div>
        </form>
    );

}
