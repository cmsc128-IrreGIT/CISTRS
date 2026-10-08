import type { SubmitEvent } from "react";
import { Link } from "react-router";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import { button_styles } from "../../../shared/styles/button_styles";
import {
    empty_logbook_values,
    logbook_fields,
    logbook_sections,
} from "../config/logbook_config";
import type { LogbookFormValues } from "../types/logbook_types";

type Props = {
    initial_values?: LogbookFormValues;
    aircraft_options: { registration: string; model: string }[];
    on_submit: (values: LogbookFormValues) => void;
};
const input_style =
    "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-red-600";
export default function LogbookForm({
    initial_values,
    aircraft_options,
    on_submit,
}: Props) {
    function handle_submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        for (const field of logbook_fields) {
            const control = form.elements.namedItem(field.key);
            if (
                control instanceof HTMLInputElement ||
                control instanceof HTMLTextAreaElement ||
                control instanceof HTMLSelectElement
            ) {
                control.setCustomValidity(
                    field.required && !control.value.trim()
                        ? "Please enter a value."
                        : "",
                );
            }
        }
        for (const field of logbook_fields) {
            const control = form.elements.namedItem(field.key);
            if (
                control instanceof HTMLInputElement ||
                control instanceof HTMLTextAreaElement ||
                control instanceof HTMLSelectElement
            ) {
                if (!control.checkValidity()) {
                    const section = control.closest("details");
                    if (section) section.open = true;
                }
            }
        }
        if (!form.reportValidity()) return;
        const data = new FormData(form);
        const values = empty_logbook_values();
        for (const field of logbook_fields)
            values[field.key] = String(data.get(field.key) ?? "").trim();
        on_submit(values);
    }
    const selected_aircraft = aircraft_options.find(
        (row) => row.registration === initial_values?.aircraft,
    );
    return (
        <form noValidate onSubmit={handle_submit} className="space-y-5">
            <p className="text-sm text-slate-600">
                Fields marked * are required for this preview. Optional sections
                can be left blank. Times use UTC. Enter a separate record for
                each flight row.
            </p>
            {logbook_sections.map((section, index) => (
                <details
                    key={section.id}
                    open={index === 0 || section.id === "defects"}
                    className="rounded-xl border border-slate-200 bg-white"
                >
                    <summary className="cursor-pointer rounded-xl px-4 py-4 font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-red-600">
                        {section.title}
                        {section.fields.some((field) => field.required)
                            ? " · Required fields"
                            : " · Optional"}
                    </summary>
                    <fieldset className="grid gap-5 border-t border-slate-100 p-4 sm:grid-cols-2">
                        <legend className="sr-only">{section.title}</legend>
                        {section.id === "identity" && (
                            <p className="text-sm text-slate-500 sm:col-span-2">
                                Aircraft type appears next to each registration
                                in the selector.
                            </p>
                        )}
                        {section.fields.map((field) => (
                            <div
                                key={field.key}
                                className={
                                    field.type === "textarea"
                                        ? "sm:col-span-2"
                                        : ""
                                }
                            >
                                <FormField
                                    id={field.key}
                                    label={field.label}
                                    required={field.required}
                                    hint={field.hint}
                                >
                                    {(props) =>
                                        field.type === "aircraft" ? (
                                            <select
                                                {...props}
                                                name={field.key}
                                                defaultValue={
                                                    initial_values?.[
                                                        field.key
                                                    ] ?? ""
                                                }
                                                onChange={(event) =>
                                                    event.currentTarget.setCustomValidity(
                                                        "",
                                                    )
                                                }
                                                className={input_style}
                                            >
                                                <option value="">
                                                    Select aircraft
                                                </option>
                                                {initial_values?.aircraft &&
                                                    !selected_aircraft && (
                                                        <option
                                                            value={
                                                                initial_values.aircraft
                                                            }
                                                        >
                                                            {
                                                                initial_values.aircraft
                                                            }{" "}
                                                            (existing record)
                                                        </option>
                                                    )}
                                                {aircraft_options.map((row) => (
                                                    <option
                                                        key={row.registration}
                                                        value={row.registration}
                                                    >
                                                        {row.registration} ·{" "}
                                                        {row.model}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : field.type === "textarea" ? (
                                            <textarea
                                                {...props}
                                                name={field.key}
                                                rows={4}
                                                maxLength={4000}
                                                defaultValue={
                                                    initial_values?.[
                                                        field.key
                                                    ] ?? ""
                                                }
                                                onChange={(event) =>
                                                    event.currentTarget.setCustomValidity(
                                                        "",
                                                    )
                                                }
                                                className={input_style}
                                            />
                                        ) : (
                                            <input
                                                {...props}
                                                name={field.key}
                                                type={field.type}
                                                min={
                                                    field.type === "number"
                                                        ? 0
                                                        : undefined
                                                }
                                                step={
                                                    field.type === "number"
                                                        ? "any"
                                                        : undefined
                                                }
                                                maxLength={
                                                    field.type === "text"
                                                        ? 200
                                                        : undefined
                                                }
                                                defaultValue={
                                                    initial_values?.[
                                                        field.key
                                                    ] ?? ""
                                                }
                                                onChange={(event) =>
                                                    event.currentTarget.setCustomValidity(
                                                        "",
                                                    )
                                                }
                                                className={input_style}
                                            />
                                        )
                                    }
                                </FormField>
                            </div>
                        ))}
                    </fieldset>
                </details>
            ))}
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
                <Link to="/logbook" className={button_styles("secondary")}>
                    Cancel
                </Link>
                <Button type="submit">Save Preview Entry</Button>
            </div>
        </form>
    );
}
