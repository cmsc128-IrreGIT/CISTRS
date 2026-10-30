import type { SubmitEvent } from "react";
import { Link } from "react-router";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import { button_styles } from "../../../shared/styles/button_styles";
import type {
    InitialStock,
    InventoryFormValues,
    InventoryLocation,
} from "../types/inventory_types";

type InventoryFormProps = {
    initial_values?: InventoryFormValues;
    locations: InventoryLocation[];
    on_submit: (
        values: InventoryFormValues,
        initial_stock?: InitialStock,
    ) => void;
    submit_text: string;
};

const text_fields = [
    { name: "part_name", label: "Item Name", required: true },
    { name: "part_number", label: "Part Number", required: true },
    { name: "unit_of_measure", label: "Unit of Measure", required: true },
] as const;

const input_style =
    "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-red-500";

export default function InventoryForm({
    initial_values,
    locations,
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

        const location = form.elements.namedItem("initial_stock_location");
        const quantity_input = form.elements.namedItem(
            "initial_stock_quantity",
        );
        if (
            location instanceof HTMLSelectElement &&
            quantity_input instanceof HTMLInputElement
        ) {
            location.setCustomValidity(
                Number(quantity_input.value) > 0 && !location.value
                    ? "Select a location for the initial stock."
                    : "",
            );
        }
        if (!form.reportValidity()) return;

        const data = new FormData(form);
        const get_text = (name: string) => String(data.get(name) ?? "").trim();
        const min_stock_level = Number(data.get("min_stock_level"));

        if (!Number.isInteger(min_stock_level) || min_stock_level < 0) {
            return;
        }

        const quantity = Number(data.get("initial_stock_quantity"));
        const location_UUID = String(data.get("initial_stock_location") ?? "");

        const initial_stock =
            !initial_values && quantity > 0 && location_UUID
                ? {
                      location_UUID,
                      quantity,
                  }
                : undefined;

        on_submit(
            {
                part_name: get_text("part_name"),
                part_number: get_text("part_number"),
                unit_of_measure: get_text("unit_of_measure"),
                min_stock_level,
                description: get_text("description"),
            },
            initial_stock,
        );
    }

    return (
        <form onSubmit={handle_submit} className="space-y-6">
            <p className="text-sm text-slate-500">
                Fields marked * are required.
            </p>

            <fieldset className="space-y-4">
                <legend className="text-base font-semibold text-slate-900">
                    Item identification
                </legend>

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
                                    maxLength={150}
                                    defaultValue={
                                        initial_values?.[field.name] ?? ""
                                    }
                                    onChange={(event) =>
                                        event.currentTarget.setCustomValidity(
                                            "",
                                        )
                                    }
                                    className={input_style}
                                />
                            )}
                        </FormField>
                    ))}
                </div>
            </fieldset>

            <fieldset className="space-y-4 border-t border-slate-200 pt-5">
                <legend className="text-base font-semibold text-slate-900">
                    Stock information
                </legend>

                <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                        id="min_stock_level"
                        label="Minimum Stock Level"
                        required
                    >
                        {(field_props) => (
                            <input
                                {...field_props}
                                name="min_stock_level"
                                type="number"
                                min="0"
                                step="1"
                                defaultValue={
                                    initial_values?.min_stock_level ?? 0
                                }
                                className={input_style}
                            />
                        )}
                    </FormField>

                    <FormField id="description" label="Description">
                        {(field_props) => (
                            <input
                                {...field_props}
                                name="description"
                                maxLength={500}
                                defaultValue={initial_values?.description ?? ""}
                                className={input_style}
                            />
                        )}
                    </FormField>
                </div>
            </fieldset>

            {!initial_values && (
                <fieldset className="space-y-4 border-t border-slate-200 pt-5">
                    <legend className="text-base font-semibold text-slate-900">
                        Initial Stock
                    </legend>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <FormField id="initial_stock_location" label="Location">
                            {(field_props) => (
                                <select
                                    {...field_props}
                                    name="initial_stock_location"
                                    onChange={(event) =>
                                        event.currentTarget.setCustomValidity(
                                            "",
                                        )
                                    }
                                    className={input_style}
                                    defaultValue=""
                                >
                                    <option value="">Select a location</option>

                                    {locations.map((location) => (
                                        <option
                                            key={location.location_UUID}
                                            value={location.location_UUID}
                                        >
                                            {location.location_name}
                                            {location.storage_area
                                                ? ` - ${location.storage_area}`
                                                : ""}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </FormField>

                        <FormField id="initial_stock_quantity" label="Quantity">
                            {(field_props) => (
                                <input
                                    {...field_props}
                                    name="initial_stock_quantity"
                                    type="number"
                                    min="0"
                                    step="1"
                                    defaultValue="0"
                                    className={input_style}
                                />
                            )}
                        </FormField>
                    </div>
                </fieldset>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <Link to="/inventory" className={button_styles("secondary")}>
                    Cancel
                </Link>

                <Button type="submit">{submit_text}</Button>
            </div>
        </form>
    );
}
