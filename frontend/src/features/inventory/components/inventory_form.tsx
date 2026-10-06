import type { SubmitEvent } from "react";
import { Link } from "react-router";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import { button_styles } from "../../../shared/styles/button_styles";
import type { InventoryFormValues } from "../types/inventory_types";

type InventoryFormProps = {
    initial_values?: InventoryFormValues;
    on_submit: (values: InventoryFormValues) => void;
    submit_text: string;
};

const text_fields = [
    { name: "name", label: "Item Name", required: true },
    { name: "part_number", label: "Part Number", required: true },
    { name: "category", label: "Category", required: true },
    { name: "unit", label: "Unit", required: true },
    { name: "aircraft", label: "Associated Aircraft", required: false },
] as const;

const input_style =
    "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-red-500";

export default function InventoryForm({
    initial_values,
    on_submit,
    submit_text,
}: InventoryFormProps) {
    function handle_submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;

        for (const field of text_fields) {
            const input = form.elements.namedItem(field.name);

            if (input instanceof HTMLInputElement) {
                input.setCustomValidity(
                    field.required && !input.value.trim()
                        ? "Please enter a value."
                        : "",
                );
            }
        }

        if (!form.reportValidity()) return;

        const data = new FormData(form);
        const get_text = (name: string) => String(data.get(name) ?? "").trim();
        const quantity = Number(data.get("quantity"));

        if (!Number.isFinite(quantity) || quantity < 0) return;

        on_submit({
            name: get_text("name"),
            part_number: get_text("part_number"),
            category: get_text("category"),
            unit: get_text("unit"),
            aircraft: get_text("aircraft") || null,
            quantity,
        });
    }

    return (
        <form onSubmit={handle_submit} className="space-y-6">
            <p className="text-sm text-slate-500">
                Fields marked * are required. Fields are provisional pending the inventory template.
            </p>

            <div className="grid gap-5 sm:grid-cols-2">
                {text_fields.map((field) => (
                    <FormField
                        key={field.name}
                        id={field.name}
                        label={field.label}
                        required={field.required}
                    >
                        {(field_props) => (
                            <input
                                {...field_props}
                                name={field.name}
                                maxLength={200}
                                defaultValue={initial_values?.[field.name] ?? ""}
                                onChange={(event) => event.currentTarget.setCustomValidity("")}
                                className={input_style}
                            />
                        )}
                    </FormField>
                ))}

                <FormField id="quantity" label="Quantity" required>
                    {(field_props) => (
                        <input
                            {...field_props}
                            name="quantity"
                            type="number"
                            min="0"
                            step="any"
                            defaultValue={initial_values?.quantity ?? 0}
                            className={input_style}
                        />
                    )}
                </FormField>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <Link to="/inventory" className={button_styles("secondary")}>
                    Cancel
                </Link>
                <Button type="submit">{submit_text}</Button>
            </div>
        </form>
    );
}