import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { api } from "../../../shared/api/client";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import DetailsList from "../../../shared/components/ui/details_list";
import { INVENTORY_FORM_INPUT } from "../../inventory/constants/inventory_form_constants";
import type { PersonnelEmployeeResponse } from "../../personnel/types/personnel_types";
import type {
    LogbookEntry,
    LogbookEmployee,
    LogbookFormValues,
    LogbookFuelDraft,
    LogbookFuelInput,
    LogbookAircraft,
    LogbookReference,
    LogbookSectorInput,
} from "../types/logbook_types";
import { employee_name } from "../utils/logbook_entries";

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
    if (!value) return { date: "", time: "" };
    const utc = new Date(value).toISOString();
    return { date: utc.slice(0, 10), time: utc.slice(11, 16) };
}

function to_api_time(date: string, time: string) {
    if (!date && !time) return null;
    if (!date || !time) {
        throw new Error("Enter both a date and a time for each flight event.");
    }
    return new Date(`${date}T${time}:00.000Z`).toISOString();
}

function as_number(value: string) {
    return value.trim() ? Number(value) : null;
}

function to_employee(value: PersonnelEmployeeResponse): LogbookEmployee {
    return {
        emp_UUID: value.emp_UUID,
        emp_number: value.emp_number,
        f_name: value.f_name,
        l_name: value.l_name,
    };
}
const steps = [
    "General Flight Details",
    "Flight Information",
    "Fuel Details",
    "Review",
];
const time_fields = [
    "std",
    "sta",
    "off_block",
    "airborne",
    "touchdown",
    "on_block",
] as const;

export default function LogbookForm({
    initial_values,
    aircraft_options,
    flight_status_options,
    flight_type_options,
    delay_category_options,
    //lookup_error,
    on_submit,
    cancel_to = "/logbook",
}: Props) {
    const [directory, set_directory] = useState<LogbookEmployee[]>([]);
    const [loading_employees, set_loading_employees] = useState(true);
    const [saving, set_saving] = useState(false);
    const [error, set_error] = useState("");
    const [step, set_step] = useState(0);
    const [review_payload, set_review_payload] =
        useState<LogbookSectorInput | null>(null);
    const save_pending = useRef(false);
    const step_heading = useRef<HTMLHeadingElement>(null);
    const [fuel_rows, set_fuel_rows] = useState<number[]>([]);
    const [fuel_drafts, set_fuel_drafts] = useState<
        Record<number, LogbookFuelDraft>
    >({});
    const [values, set_values] = useState<LogbookFormValues>(() => ({
        aircraft_UUID: "",
        flight_status_UUID: "",
        flight_type_UUID: "",
        pic_emp_UUID: "",
        flight_date: "",
        route: "",
        sic_emp_UUID: "",
        observer_emp_UUID: "",
        delay_category_UUID: "",
        std: "",
        sta: "",
        off_block: "",
        airborne: "",
        touchdown: "",
        on_block: "",
        flight_time: "",
        day_night: "",
        pax_count: "0",
        fuel_departure: "",
        fuel_arrival: "",
        fuel_used: "",
        fuel_unit: "",
        delay_cause: "",
        qa_check_status: "",
        fuel_transactions: [],
        ...(initial_values
            ? {
                  aircraft_UUID: initial_values.aircraft.aircraft_UUID,
                  flight_status_UUID:
                      initial_values.flight_status.flight_status_UUID,
                  flight_type_UUID: initial_values.flight_type.flight_type_UUID,
                  pic_emp_UUID: initial_values.pic.emp_UUID,
                  flight_date: initial_values.flight_date,
                  route: initial_values.route,
                  sic_emp_UUID: initial_values.sic?.emp_UUID ?? "",
                  observer_emp_UUID: initial_values.observer?.emp_UUID ?? "",
                  delay_category_UUID:
                      initial_values.delay_category?.delay_category_UUID ?? "",
                  std: initial_values.std ?? "",
                  sta: initial_values.sta ?? "",
                  off_block: initial_values.off_block ?? "",
                  airborne: initial_values.airborne ?? "",
                  touchdown: initial_values.touchdown ?? "",
                  on_block: initial_values.on_block ?? "",
                  flight_time:
                      initial_values.flight_time === null
                          ? ""
                          : String(initial_values.flight_time),
                  day_night: initial_values.day_night ?? "",
                  pax_count: String(initial_values.pax_count),
                  fuel_departure:
                      initial_values.fuel_departure === null
                          ? ""
                          : String(initial_values.fuel_departure),
                  fuel_arrival:
                      initial_values.fuel_arrival === null
                          ? ""
                          : String(initial_values.fuel_arrival),
                  fuel_used:
                      initial_values.fuel_used === null
                          ? ""
                          : String(initial_values.fuel_used),
                  fuel_unit: initial_values.fuel_unit ?? "",
                  delay_cause: initial_values.delay_cause ?? "",
                  qa_check_status: initial_values.qa_check_status ?? "",
              }
            : {}),
    }));

    useEffect(() => {
        let active = true;
        api<PersonnelEmployeeResponse[]>("/personnel/directory")
            .then((rows) => {
                if (active) set_directory(rows.map(to_employee));
            })
            .catch((cause: unknown) => {
                if (active)
                    set_error(
                        cause instanceof Error
                            ? cause.message
                            : "Could not load active crew members.",
                    );
            })
            .finally(() => {
                if (active) set_loading_employees(false);
            });
        return () => {
            active = false;
        };
    }, []);

    const current_crew = initial_values
        ? [
              initial_values.pic,
              initial_values.sic,
              initial_values.observer,
          ].filter((row): row is LogbookEmployee => Boolean(row))
        : [];
    const employees = [
        ...directory,
        ...current_crew.filter(
            (row) =>
                !directory.some(
                    (candidate) => candidate.emp_UUID === row.emp_UUID,
                ),
        ),
    ];
    useEffect(() => {
        step_heading.current?.focus();
    }, [step]);

    function set_value(key: keyof LogbookFormValues, value: string) {
        set_values((current) => ({ ...current, [key]: value }));
    }

    function add_fuel_entry() {
        const next = fuel_rows.length ? Math.max(...fuel_rows) + 1 : 0;
        set_fuel_rows((rows) => [...rows, next]);
        set_fuel_drafts((rows) => ({
            ...rows,
            [next]: {
                issued_to: "",
                transaction_date: values.flight_date,
                transaction_type: "",
                quantity_gal: "",
                remarks: "",
            },
        }));
    }

    function change_fuel(
        index: number,
        key: keyof LogbookFuelDraft,
        value: string,
    ) {
        set_fuel_drafts((rows) => ({
            ...rows,
            [index]: { ...rows[index], [key]: value },
        }));
    }

    function handle_submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (save_pending.current) return;
        if (step === 3) {
            void confirm_save();
            return;
        }
        set_error("");
        const active_fields = event.currentTarget.querySelectorAll<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >(
            `[data-logbook-step="${step}"] input, [data-logbook-step="${step}"] select, [data-logbook-step="${step}"] textarea`,
        );
        const invalid = Array.from(active_fields).find(
            (field) => !field.checkValidity(),
        );
        if (invalid) {
            set_error(
                "Complete the required fields and enter valid values before continuing.",
            );
            invalid.focus();
            invalid.reportValidity();
            return;
        }
        const form_data = new FormData(event.currentTarget);
        const read = (name: string) => String(form_data.get(name) ?? "").trim();
        if (step === 0) {
            if (!read("route")) {
                set_error("Enter a route before continuing.");
                return;
            }
            const crew = [
                read("pic_emp_UUID"),
                read("sic_emp_UUID"),
                read("observer_emp_UUID"),
            ].filter(Boolean);
            if (new Set(crew).size !== crew.length) {
                set_error("Choose a different employee for each crew role.");
                return;
            }
            set_step(1);
            return;
        }
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
                std: to_api_time(read("std_date"), read("std_time")),
                sta: to_api_time(read("sta_date"), read("sta_time")),
                off_block: to_api_time(
                    read("off_block_date"),
                    read("off_block_time"),
                ),
                airborne: to_api_time(
                    read("airborne_date"),
                    read("airborne_time"),
                ),
                touchdown: to_api_time(
                    read("touchdown_date"),
                    read("touchdown_time"),
                ),
                on_block: to_api_time(
                    read("on_block_date"),
                    read("on_block_time"),
                ),
                flight_time: as_number(read("flight_time")),
                day_night: (read("day_night") || null) as
                    "Day" | "Night" | null,
                pax_count: Number(read("pax_count") || 0),
                fuel_departure: as_number(read("fuel_departure")),
                fuel_arrival: as_number(read("fuel_arrival")),
                fuel_used: as_number(read("fuel_used")),
                fuel_unit: read("fuel_unit") || null,
                delay_cause: read("delay_cause") || null,
                qa_check_status: read("qa_check_status") || null,
            };
        } catch (cause) {
            set_error(
                cause instanceof Error
                    ? cause.message
                    : "Enter valid flight dates and times.",
            );
            return;
        }

        if (step === 1) {
            if (payload.std && payload.sta && payload.sta < payload.std) {
                set_error(
                    "Scheduled arrival cannot be before scheduled departure.",
                );
                return;
            }
            const events = [
                payload.off_block,
                payload.airborne,
                payload.touchdown,
                payload.on_block,
            ].filter((value): value is string => Boolean(value));
            if (
                events.some(
                    (value, index) => index > 0 && value < events[index - 1],
                )
            ) {
                set_error("Flight event times must follow their flight order.");
                return;
            }
            set_step(2);
            return;
        }
        if (
            (payload.fuel_departure !== null ||
                payload.fuel_arrival !== null ||
                payload.fuel_used !== null) &&
            !payload.fuel_unit
        ) {
            set_error("Enter a fuel unit when fuel quantities are recorded.");
            return;
        }
        if (
            payload.fuel_departure != null &&
            payload.fuel_arrival != null &&
            payload.fuel_arrival > payload.fuel_departure
        ) {
            set_error("Fuel at arrival cannot exceed fuel at departure.");
            return;
        }
        if (
            payload.fuel_departure != null &&
            payload.fuel_arrival != null &&
            payload.fuel_used != null &&
            Math.abs(
                payload.fuel_departure -
                    payload.fuel_arrival -
                    payload.fuel_used,
            ) > 0.01
        ) {
            set_error(
                "Fuel used must equal fuel at departure minus fuel at arrival.",
            );
            return;
        }

        const incomplete_fuel = fuel_rows.some((index) => {
            const row = fuel_drafts[index];
            return (
                !row?.issued_to ||
                !row.transaction_date ||
                !row.transaction_type.trim() ||
                !row.quantity_gal ||
                !Number.isFinite(Number(row.quantity_gal)) ||
                Number(row.quantity_gal) <= 0
            );
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
            set_error(
                "Flight status and type options are not available. The backend needs to provide lookup data or an existing logbook entry.",
            );
            return;
        }
        set_review_payload(payload);
        set_step(3);
    }

    async function confirm_save() {
        if (!review_payload || save_pending.current) return;
        save_pending.current = true;
        set_error("");
        set_saving(true);
        try {
            await on_submit(review_payload);
        } catch (cause) {
            set_error(
                cause instanceof Error
                    ? cause.message
                    : "Could not save the logbook entry.",
            );
        } finally {
            save_pending.current = false;
            set_saving(false);
        }
    }

    const employee_control = (
        name: keyof LogbookFormValues,
        label: string,
        required = false,
        exclude: string[] = [],
    ) => (
        <FormField label={label} required={required}>
            {(props) => (
                <select
                    {...props}
                    name={name}
                    required={required}
                    disabled={loading_employees || saving}
                    value={values[name] as string}
                    onChange={(event) =>
                        set_value(name, event.currentTarget.value)
                    }
                    className={INVENTORY_FORM_INPUT}
                >
                    <option value="">
                        {loading_employees
                            ? "Loading active employees…"
                            : "Select an employee"}
                    </option>
                    {employees
                        .filter(
                            (row) =>
                                !exclude.includes(row.emp_UUID) ||
                                row.emp_UUID === values[name],
                        )
                        .map((row) => (
                            <option key={row.emp_UUID} value={row.emp_UUID}>
                                {employee_name(row)} ({row.emp_number})
                            </option>
                        ))}
                </select>
            )}
        </FormField>
    );

    const select_control = (
        name: keyof LogbookFormValues,
        label: string,
        options: LogbookReference[],
        required = false,
    ) => (
        <FormField label={label} required={required}>
            {(props) => (
                <div className="relative">
                    <select
                        {...props}
                        name={name}
                        required={required}
                        value={values[name] as string}
                        onChange={(event) =>
                            set_value(name, event.currentTarget.value)
                        }
                        className={`${INVENTORY_FORM_INPUT} appearance-none pr-9`}
                    >
                        <option value="">Select {label.toLowerCase()}</option>
                        {options.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown
                        size={16}
                        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-600"
                        aria-hidden="true"
                    />
                </div>
            )}
        </FormField>
    );

    const text_control = (
        name: keyof LogbookFormValues,
        label: string,
        type = "text",
        required = false,
        wide = false,
        multiline = false,
    ) => (
        <div className={wide ? "sm:col-span-2" : undefined} key={name}>
            <FormField label={label} required={required}>
                {(props) =>
                    multiline ? (
                        <textarea
                            {...props}
                            name={name}
                            required={required}
                            rows={3}
                            maxLength={type === "text" ? 500 : undefined}
                            value={values[name] as string}
                            onChange={(event) =>
                                set_value(name, event.currentTarget.value)
                            }
                            className={`${INVENTORY_FORM_INPUT} resize-y`}
                        />
                    ) : (
                        <input
                            {...props}
                            name={name}
                            type={type}
                            required={required}
                            min={type === "number" ? 0 : undefined}
                            step={
                                type === "number"
                                    ? name === "pax_count"
                                        ? "1"
                                        : "0.01"
                                    : undefined
                            }
                            max={
                                name === "pax_count"
                                    ? 999
                                    : name === "flight_time"
                                      ? 9999.99
                                      : undefined
                            }
                            value={values[name] as string}
                            onChange={(event) =>
                                set_value(name, event.currentTarget.value)
                            }
                            className={INVENTORY_FORM_INPUT}
                        />
                    )
                }
            </FormField>
        </div>
    );

    const flight_datetime_control = (
        name:
            "std" | "sta" | "off_block" | "airborne" | "touchdown" | "on_block",
        label: string,
    ) => {
        const parts = to_input_parts(values[name] || null);
        return (
            <div
                key={name}
                className="grid min-w-0 gap-3 sm:col-span-2 sm:grid-cols-2"
            >
                <FormField label={`${label} date (UTC)`}>
                    {(props) => (
                        <input
                            {...props}
                            aria-label={`${label} date`}
                            name={`${name}_date`}
                            type="date"
                            defaultValue={parts.date}
                            className={`${INVENTORY_FORM_INPUT} min-w-0`}
                        />
                    )}
                </FormField>
                <FormField label={`${label} time (UTC)`}>
                    {(props) => (
                        <input
                            {...props}
                            aria-label={`${label} time`}
                            name={`${name}_time`}
                            type="time"
                            step={60}
                            defaultValue={parts.time}
                            className={`${INVENTORY_FORM_INPUT} min-w-0`}
                        />
                    )}
                </FormField>
            </div>
        );
    };

    const has_lookup_options =
        flight_status_options.length > 0 && flight_type_options.length > 0;
    const crew_name = (id?: string | null) => {
        const employee = employees.find((row) => row.emp_UUID === id);
        return employee ? employee_name(employee) : "Not recorded";
    };
    const reviewed_fuel =
        initial_values?.fuel_transactions ??
        review_payload?.fuel_transactions ??
        [];

    return (
        <form
            noValidate
            onSubmit={handle_submit}
            onChange={() => set_review_payload(null)}
        >
            <div className="space-y-4 px-4 py-4 sm:px-5">
                <ol
                    aria-label="Logbook entry steps"
                    className="grid grid-cols-4 gap-2 border-b border-slate-200 pb-4"
                >
                    {steps.map((label, index) => (
                        <li
                            key={label}
                            aria-current={step === index ? "step" : undefined}
                            className="flex flex-col items-center gap-2 text-center"
                        >
                            <span
                                aria-hidden="true"
                                className={`grid size-9 place-items-center rounded-full border text-sm font-semibold ${step === index ? "border-[#0b2238] bg-[#0b2238] text-white" : index < step ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-white text-slate-500"}`}
                            >
                                {index + 1}
                            </span>
                            <span
                                className={`text-xs font-medium ${step === index ? "text-[#0b2238]" : "text-slate-500"}`}
                            >
                                {label}
                            </span>
                        </li>
                    ))}
                </ol>
                <h3
                    ref={step_heading}
                    tabIndex={-1}
                    className="text-sm font-semibold text-[#0b2238] focus:outline-none"
                >
                    Step {step + 1} of 4: {steps[step]}
                </h3>
                {step < 3 && (
                    <p className="text-xs text-slate-600">
                        <span className="text-red-700">*</span> indicates a
                        required field.
                    </p>
                )}
                {error && (
                    <p
                        role="alert"
                        className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"
                    >
                        {error}
                    </p>
                )}
                {/* {lookup_error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">Could not load flight lookup options: {lookup_error}</p>}
                {!lookup_error && !has_lookup_options && <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">No flight status or type options were returned by the lookup service.</p>}
                {!aircraft_options.length && <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">No aircraft are available. Your account may not have access to the aircraft list.</p>} */}
                <fieldset
                    data-logbook-step="0"
                    disabled={saving}
                    hidden={step !== 0}
                    className={`${step === 0 ? "grid" : "hidden"} min-w-0 gap-3 sm:grid-cols-2`}
                >
                    <legend className="sr-only">General Flight Details</legend>
                    <FormField label="Aircraft" required>
                        {(props) => (
                            <select
                                {...props}
                                name="aircraft_UUID"
                                required
                                value={values.aircraft_UUID}
                                onChange={(event) =>
                                    set_value(
                                        "aircraft_UUID",
                                        event.currentTarget.value,
                                    )
                                }
                                className={INVENTORY_FORM_INPUT}
                            >
                                <option value="">Select aircraft</option>
                                {aircraft_options.map((row) => (
                                    <option
                                        key={row.aircraft_UUID}
                                        value={row.aircraft_UUID}
                                    >
                                        {row.registration}
                                    </option>
                                ))}
                            </select>
                        )}
                    </FormField>
                    {text_control("flight_date", "Flight date", "date", true)}
                    {text_control("route", "Route", "text", true)}
                    {select_control(
                        "flight_status_UUID",
                        "Flight status",
                        flight_status_options,
                        true,
                    )}
                    {select_control(
                        "flight_type_UUID",
                        "Flight type",
                        flight_type_options,
                        true,
                    )}
                    {employee_control("pic_emp_UUID", "Pilot in command", true)}
                    {employee_control(
                        "sic_emp_UUID",
                        "Second in command",
                        false,
                        [values.pic_emp_UUID],
                    )}
                    {employee_control("observer_emp_UUID", "Observer", false, [
                        values.pic_emp_UUID,
                        values.sic_emp_UUID,
                    ])}
                </fieldset>

                <fieldset
                    data-logbook-step="1"
                    disabled={saving}
                    hidden={step !== 1}
                    className={`${step === 1 ? "grid" : "hidden"} min-w-0 gap-3 sm:grid-cols-2`}
                >
                    <legend className="sr-only">Flight Information</legend>
                    {select_control(
                        "delay_category_UUID",
                        "Delay category",
                        delay_category_options,
                    )}
                    <FormField label="Day or night">
                        {(props) => (
                            <select
                                {...props}
                                name="day_night"
                                value={values.day_night}
                                onChange={(event) =>
                                    set_value(
                                        "day_night",
                                        event.currentTarget.value,
                                    )
                                }
                                className={INVENTORY_FORM_INPUT}
                            >
                                <option value="">Not recorded</option>
                                <option value="Day">Day</option>
                                <option value="Night">Night</option>
                            </select>
                        )}
                    </FormField>
                    {flight_datetime_control(
                        "std",
                        "Scheduled departure (STD)",
                    )}
                    {flight_datetime_control("sta", "Scheduled arrival (STA)")}
                    {flight_datetime_control("off_block", "Off-block")}
                    {flight_datetime_control("airborne", "Airborne")}
                    {flight_datetime_control("touchdown", "Touchdown")}
                    {flight_datetime_control("on_block", "On-block")}
                    {text_control(
                        "flight_time",
                        "Flight time (hours)",
                        "number",
                    )}
                    {text_control("pax_count", "Passenger count", "number")}
                    {text_control(
                        "delay_cause",
                        "Delay cause",
                        "text",
                        false,
                        false,
                        true,
                    )}
                    {text_control("qa_check_status", "QA check status")}
                </fieldset>
                <fieldset
                    data-logbook-step="2"
                    disabled={saving}
                    hidden={step !== 2}
                    className={`${step === 2 ? "grid" : "hidden"} min-w-0 gap-3 sm:grid-cols-2`}
                >
                    <legend className="sr-only">Fuel</legend>
                    {text_control(
                        "fuel_departure",
                        "Fuel at departure",
                        "number",
                    )}
                    {text_control("fuel_arrival", "Fuel at arrival", "number")}
                    {text_control("fuel_used", "Fuel used", "number")}
                    {text_control("fuel_unit", "Fuel unit")}
                    <div className="sm:col-span-2">
                        {!initial_values && (
                            <section
                                aria-labelledby="fuel_transactions_heading"
                                className="space-y-3 border-t border-slate-200 pt-3"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <h3
                                        id="fuel_transactions_heading"
                                        className="text-sm font-semibold text-slate-900"
                                    >
                                        Fuel Transactions
                                    </h3>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={add_fuel_entry}
                                    >
                                        <Plus size={15} aria-hidden="true" />{" "}
                                        Add Fuel Entry
                                    </Button>
                                </div>
                                {fuel_rows.map((index) => {
                                    const row = fuel_drafts[index];
                                    return (
                                        <fieldset
                                            key={index}
                                            className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-2"
                                        >
                                            <legend className="sr-only">
                                                Fuel entry {index + 1}
                                            </legend>
                                            <FormField
                                                label="Issued to"
                                                required
                                            >
                                                {(props) => (
                                                    <select
                                                        {...props}
                                                        required
                                                        disabled={
                                                            loading_employees ||
                                                            saving
                                                        }
                                                        value={
                                                            row?.issued_to ?? ""
                                                        }
                                                        onChange={(event) =>
                                                            change_fuel(
                                                                index,
                                                                "issued_to",
                                                                event
                                                                    .currentTarget
                                                                    .value,
                                                            )
                                                        }
                                                        className={
                                                            INVENTORY_FORM_INPUT
                                                        }
                                                    >
                                                        <option value="">
                                                            {loading_employees
                                                                ? "Loading employees..."
                                                                : "Select an employee"}
                                                        </option>
                                                        {employees.map(
                                                            (employee) => (
                                                                <option
                                                                    key={
                                                                        employee.emp_UUID
                                                                    }
                                                                    value={
                                                                        employee.emp_UUID
                                                                    }
                                                                >
                                                                    {employee_name(
                                                                        employee,
                                                                    )}{" "}
                                                                    (
                                                                    {
                                                                        employee.emp_number
                                                                    }
                                                                    )
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                )}
                                            </FormField>
                                            <FormField
                                                label="Transaction date"
                                                required
                                            >
                                                {(props) => (
                                                    <input
                                                        {...props}
                                                        type="date"
                                                        required
                                                        disabled={saving}
                                                        value={
                                                            row?.transaction_date ??
                                                            ""
                                                        }
                                                        onChange={(event) =>
                                                            change_fuel(
                                                                index,
                                                                "transaction_date",
                                                                event
                                                                    .currentTarget
                                                                    .value,
                                                            )
                                                        }
                                                        className={
                                                            INVENTORY_FORM_INPUT
                                                        }
                                                    />
                                                )}
                                            </FormField>
                                            <FormField
                                                label="Transaction type"
                                                required
                                            >
                                                {(props) => (
                                                    <input
                                                        {...props}
                                                        required
                                                        maxLength={50}
                                                        disabled={saving}
                                                        value={
                                                            row?.transaction_type ??
                                                            ""
                                                        }
                                                        onChange={(event) =>
                                                            change_fuel(
                                                                index,
                                                                "transaction_type",
                                                                event
                                                                    .currentTarget
                                                                    .value,
                                                            )
                                                        }
                                                        className={
                                                            INVENTORY_FORM_INPUT
                                                        }
                                                    />
                                                )}
                                            </FormField>
                                            <FormField
                                                label="Quantity (gal)"
                                                required
                                            >
                                                {(props) => (
                                                    <input
                                                        {...props}
                                                        type="number"
                                                        min="0.01"
                                                        step="0.01"
                                                        required
                                                        disabled={saving}
                                                        value={
                                                            row?.quantity_gal ??
                                                            ""
                                                        }
                                                        onChange={(event) =>
                                                            change_fuel(
                                                                index,
                                                                "quantity_gal",
                                                                event
                                                                    .currentTarget
                                                                    .value,
                                                            )
                                                        }
                                                        className={
                                                            INVENTORY_FORM_INPUT
                                                        }
                                                    />
                                                )}
                                            </FormField>
                                            <div className="sm:col-span-2">
                                                <FormField label="Remarks">
                                                    {(props) => (
                                                        <textarea
                                                            {...props}
                                                            rows={2}
                                                            maxLength={500}
                                                            disabled={saving}
                                                            value={
                                                                row?.remarks ??
                                                                ""
                                                            }
                                                            onChange={(event) =>
                                                                change_fuel(
                                                                    index,
                                                                    "remarks",
                                                                    event
                                                                        .currentTarget
                                                                        .value,
                                                                )
                                                            }
                                                            className={`${INVENTORY_FORM_INPUT} resize-y`}
                                                        />
                                                    )}
                                                </FormField>
                                            </div>
                                            <div className="sm:col-span-2 flex justify-start">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    disabled={saving}
                                                    onClick={() =>
                                                        set_fuel_rows((rows) =>
                                                            rows.filter(
                                                                (item) =>
                                                                    item !==
                                                                    index,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    Cancel Fuel Entry
                                                </Button>
                                            </div>
                                        </fieldset>
                                    );
                                })}
                            </section>
                        )}
                        {initial_values && (
                            <p className="text-sm text-slate-600">
                                This entry has{" "}
                                {initial_values.fuel_transactions.length} saved
                                fuel transactions. Manage these from the logbook
                                entry details.
                            </p>
                        )}
                    </div>
                </fieldset>
                {step === 3 && review_payload && (
                    <div className="space-y-5">
                        <section
                            aria-label="Review general flight details"
                            className="space-y-3"
                        >
                            <h4 className="text-sm font-semibold">
                                General Flight Details
                            </h4>
                            <DetailsList
                                entries={[
                                    {
                                        id: "aircraft",
                                        label: "Aircraft",
                                        value:
                                            aircraft_options.find(
                                                (row) =>
                                                    row.aircraft_UUID ===
                                                    review_payload.aircraft_UUID,
                                            )?.registration || "Not recorded",
                                    },
                                    {
                                        id: "date",
                                        label: "Flight date",
                                        value: review_payload.flight_date,
                                    },
                                    {
                                        id: "route",
                                        label: "Route",
                                        value: review_payload.route,
                                    },
                                    {
                                        id: "status",
                                        label: "Flight status",
                                        value:
                                            flight_status_options.find(
                                                (row) =>
                                                    row.id ===
                                                    review_payload.flight_status_UUID,
                                            )?.name || "Not recorded",
                                    },
                                    {
                                        id: "type",
                                        label: "Flight type",
                                        value:
                                            flight_type_options.find(
                                                (row) =>
                                                    row.id ===
                                                    review_payload.flight_type_UUID,
                                            )?.name || "Not recorded",
                                    },
                                    {
                                        id: "pic",
                                        label: "Pilot in command",
                                        value: crew_name(
                                            review_payload.pic_emp_UUID,
                                        ),
                                    },
                                    {
                                        id: "sic",
                                        label: "Second in command",
                                        value: crew_name(
                                            review_payload.sic_emp_UUID,
                                        ),
                                    },
                                    {
                                        id: "observer",
                                        label: "Observer",
                                        value: crew_name(
                                            review_payload.observer_emp_UUID,
                                        ),
                                    },
                                ]}
                            />
                        </section>
                        <section
                            aria-label="Review flight information"
                            className="space-y-3 border-t border-slate-200 pt-4"
                        >
                            <h4 className="text-sm font-semibold">
                                Flight Information
                            </h4>
                            <DetailsList
                                entries={[
                                    {
                                        id: "delay",
                                        label: "Delay category",
                                        value:
                                            delay_category_options.find(
                                                (row) =>
                                                    row.id ===
                                                    review_payload.delay_category_UUID,
                                            )?.name || "Not recorded",
                                    },
                                    {
                                        id: "day",
                                        label: "Day or night",
                                        value:
                                            review_payload.day_night ||
                                            "Not recorded",
                                    },
                                    ...time_fields.map((key) => ({
                                        id: key,
                                        label: key
                                            .replaceAll("_", " ")
                                            .toUpperCase(),
                                        value: review_payload[key]
                                            ? `${new Date(review_payload[key]).toLocaleString("en-GB", { timeZone: "UTC" })} UTC`
                                            : "Not recorded",
                                    })),
                                    {
                                        id: "time",
                                        label: "Flight time (hours)",
                                        value:
                                            review_payload.flight_time ??
                                            "Not recorded",
                                    },
                                    {
                                        id: "pax",
                                        label: "Passenger count",
                                        value: review_payload.pax_count ?? 0,
                                    },
                                    {
                                        id: "cause",
                                        label: "Delay cause",
                                        value:
                                            review_payload.delay_cause ||
                                            "Not recorded",
                                    },
                                    {
                                        id: "qa",
                                        label: "QA check status",
                                        value:
                                            review_payload.qa_check_status ||
                                            "Not recorded",
                                    },
                                ]}
                            />
                        </section>
                        <section
                            aria-label="Review fuel"
                            className="space-y-3 border-t border-slate-200 pt-4"
                        >
                            <h4 className="text-sm font-semibold">Fuel</h4>
                            <DetailsList
                                entries={[
                                    {
                                        id: "departure",
                                        label: "Fuel at departure",
                                        value:
                                            review_payload.fuel_departure ??
                                            "Not recorded",
                                    },
                                    {
                                        id: "arrival",
                                        label: "Fuel at arrival",
                                        value:
                                            review_payload.fuel_arrival ??
                                            "Not recorded",
                                    },
                                    {
                                        id: "used",
                                        label: "Fuel used",
                                        value:
                                            review_payload.fuel_used ??
                                            "Not recorded",
                                    },
                                    {
                                        id: "unit",
                                        label: "Fuel unit",
                                        value:
                                            review_payload.fuel_unit ||
                                            "Not recorded",
                                    },
                                ]}
                            />
                            <h5 className="text-sm font-semibold">
                                Fuel Transactions
                            </h5>
                            {reviewed_fuel.length ? (
                                reviewed_fuel.map((row, index) => (
                                    <div
                                        key={index}
                                        className="rounded-md bg-slate-100 p-3"
                                    >
                                        <DetailsList
                                            entries={[
                                                {
                                                    id: "recipient",
                                                    label: "Issued to",
                                                    value:
                                                        typeof row.issued_to ===
                                                        "string"
                                                            ? crew_name(
                                                                  row.issued_to,
                                                              )
                                                            : employee_name(
                                                                  row.issued_to,
                                                              ),
                                                },
                                                {
                                                    id: "date",
                                                    label: "Transaction date",
                                                    value: row.transaction_date,
                                                },
                                                {
                                                    id: "type",
                                                    label: "Transaction type",
                                                    value: row.transaction_type,
                                                },
                                                {
                                                    id: "quantity",
                                                    label: "Quantity (gal)",
                                                    value: row.quantity_gal,
                                                },
                                                {
                                                    id: "remarks",
                                                    label: "Remarks",
                                                    value:
                                                        row.remarks ||
                                                        "Not recorded",
                                                },
                                            ]}
                                        />
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-600">
                                    No fuel transactions added.
                                </p>
                            )}
                        </section>
                    </div>
                )}
            </div>
            <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
                <Link
                    to={cancel_to}
                    className="mr-auto min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                    Cancel
                </Link>
                {step > 0 && (
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={saving}
                        onClick={() => {
                            set_step((current) => current - 1);
                            set_error("");
                        }}
                    >
                        Back
                    </Button>
                )}
                <Button
                    type="submit"
                    is_loading={saving}
                    disabled={
                        loading_employees ||
                        !has_lookup_options ||
                        !aircraft_options.length
                    }
                    className="min-w-28"
                >
                    {step < 2
                        ? "Next"
                        : step === 2
                          ? "Review entry"
                          : initial_values
                            ? "Update entry"
                            : "Save entry"}
                </Button>
            </div>
        </form>
    );
}
