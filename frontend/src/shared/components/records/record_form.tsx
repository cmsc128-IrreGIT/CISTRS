import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link } from "react-router";
import FormField from "../forms/form_field";
import Button from "../ui/button";
import { button_styles } from "../../styles/button_styles";
import type { PreviewRecord, RecordField } from "../../types/record_types";

const input_style =
    "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-red-600";
export default function RecordForm({
    fields,
    initial_values,
    on_submit,
    cancel_to,
    submit_text,
}: {
    fields: RecordField[];
    initial_values?: PreviewRecord;
    on_submit: (values: Omit<PreviewRecord, "id">) => void;
    cancel_to: string;
    submit_text: string;
}) {
    const [error, set_error] = useState("");
    function handle_submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const values = Object.fromEntries(
            fields.map(({ key }) => [key, String(data.get(key) ?? "").trim()]),
        );
        if (fields.some((field) => field.required && !values[field.key])) {
            set_error("Please complete all required fields.");
            return;
        }
        set_error("");
        on_submit(values);
    }
    return (
        <form onSubmit={handle_submit} className="space-y-5">
            <p className="text-sm text-slate-500">
                Fields marked * are required. Fields are provisional.
            </p>
            {error && (
                <p role="alert" className="text-sm text-red-700">
                    {error}
                </p>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
                {fields.map((field) => (
                    <FormField
                        key={field.key}
                        label={field.label}
                        required={field.required}
                    >
                        {(props) =>
                            field.type === "select" ? (
                                <select
                                    {...props}
                                    name={field.key}
                                    defaultValue={
                                        initial_values?.[field.key] ?? ""
                                    }
                                    className={input_style}
                                >
                                    <option value="">Select an option</option>
                                    {field.options?.map((option) => {
                                        const value =
                                            typeof option === "string"
                                                ? option
                                                : option.value;
                                        const label =
                                            typeof option === "string"
                                                ? option
                                                : option.label;
                                        return (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        );
                                    })}
                                </select>
                            ) : field.type === "textarea" ? (
                                <textarea
                                    {...props}
                                    name={field.key}
                                    rows={4}
                                    maxLength={2000}
                                    defaultValue={
                                        initial_values?.[field.key] ?? ""
                                    }
                                    className={input_style}
                                />
                            ) : (
                                <input
                                    {...props}
                                    name={field.key}
                                    type={field.type ?? "text"}
                                    maxLength={200}
                                    defaultValue={
                                        initial_values?.[field.key] ?? ""
                                    }
                                    className={input_style}
                                />
                            )
                        }
                    </FormField>
                ))}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <Link to={cancel_to} className={button_styles("secondary")}>
                    Cancel
                </Link>
                <Button type="submit">{submit_text}</Button>
            </div>
        </form>
    );
}
