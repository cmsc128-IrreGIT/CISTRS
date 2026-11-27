import {
    changedFormField,
    usePersistedForm,
} from "../../../shared/hooks/use_persist_forms";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
import type { FormEvent, SubmitEvent } from "react";
import FeatureHelp from "../../../shared/components/feedback/feature_help";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import { INVENTORY_PRIMARY_ACTION } from "../constants/inventory_constants";
import { INVENTORY_FORM_INPUT } from "../constants/inventory_form_constants";
import type {
    InitialStock,
    InventoryFormValues,
    InventoryItem,
    InventoryStorageLocation,
} from "../types/inventory_types";
import { format_inventory_expiry } from "../utils/inventory_dates";
import InventoryQuantityField from "./inventory_quantity_field";
import InventoryUnitField from "./inventory_unit_field";

const storage_area_help = "Storage areas are listed for the selected location.";

type FieldName =
    | Exclude<keyof InventoryFormValues, "description">
    | "initial_stock_location"
    | "initial_stock_area"
    | "initial_stock_quantity";
type FieldErrors = Partial<Record<FieldName, string>>;

type InventoryFormProps = {
    initial_values?: InventoryFormValues;
    item?: InventoryItem;
    locations: InventoryStorageLocation[];
    units?: string[];
    on_submit: (
        values: InventoryFormValues,
        initial_stock?: InitialStock,
    ) => void | boolean | Promise<boolean>;
    on_cancel: () => void;
    discard_ref?: React.Ref<() => void>;
    is_saving?: boolean;
    save_error?: string | null;
};

export default function InventoryForm({
    initial_values,
    item,
    locations,
    units = [],
    on_submit,
    on_cancel,
    discard_ref,
    is_saving = false,
    save_error,
}: InventoryFormProps) {
    const [errors, set_errors] = useState<FieldErrors>({});
    const [draft, set_draft, { clear }] = usePersistedForm<
        Record<string, string>
    >(`inventory:${item?.part_UUID ?? "new"}`, {});
    useImperativeHandle(discard_ref, () => clear);
    const location_name = draft.initial_stock_location ?? "";
    const area_id = draft.initial_stock_area ?? "";
    function remember(name: string, value: string) {
        set_draft((current) => ({ ...current, [name]: value }));
    }
    const location_names = [
        ...new Set(locations.map((location) => location.location_name)),
    ];
    const areas = locations.filter(
        (location) => location.location_name === location_name,
    );
    const selected_area = areas.length === 1 ? areas[0].location_UUID : area_id;
    const save_alert = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (save_error) save_alert.current?.focus();
    }, [save_error]);

    function clear_error(event: FormEvent<HTMLFormElement>) {
        const field = changedFormField(event);
        if (
            field &&
            !field.name.startsWith("initial_stock_") &&
            field.name !== "unit_of_measure" &&
            field.name !== "min_stock_level"
        ) {
            remember(field.name, field.value);
        }
        if (!(
            field instanceof HTMLInputElement ||
            field instanceof HTMLSelectElement
        ))
            return;
        clear_field_error(field.name as FieldName, field.value);
    }

    function clear_field_error(name: FieldName, value: string) {
        set_errors((current) => {
            const reset_stock_errors =
                name === "initial_stock_quantity" && value === "0";
            const clear_area =
                reset_stock_errors || name === "initial_stock_location";
            if (
                !current[name] &&
                !(clear_area && current.initial_stock_area) &&
                !(reset_stock_errors && current.initial_stock_location)
            )
                return current;
            const next = { ...current };
            delete next[name];
            if (clear_area) delete next.initial_stock_area;
            if (reset_stock_errors) delete next.initial_stock_location;
            return next;
        });
    }

    async function handle_submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (is_saving) return;

        const form = event.currentTarget;
        const data = new FormData(form);
        const get_text = (name: string) => String(data.get(name) ?? "").trim();
        const next_errors: FieldErrors = {};

        const minimum = get_text("min_stock_level");
        const values: InventoryFormValues = {
            part_name: get_text("part_name"),
            part_number: get_text("part_number"),
            unit_of_measure: get_text("unit_of_measure"),
            min_stock_level: Number(minimum),
            description: get_text("description"),
        };

        if (!values.part_name) {
            next_errors.part_name =
                "Enter an item name. Spaces alone are not accepted.";
        }
        if (!values.part_number) {
            next_errors.part_number = "Enter a part number.";
        } else if (values.part_number.length > 50) {
            next_errors.part_number =
                "Part number must be at most 50 characters.";
        }
        if (!values.unit_of_measure) {
            next_errors.unit_of_measure = "Enter a unit of measure.";
        }
        if (
            !minimum ||
            !Number.isSafeInteger(values.min_stock_level) ||
            values.min_stock_level < 0
        ) {
            next_errors.min_stock_level = "Enter a whole number of 0 or more.";
        }

        const opening = get_text("initial_stock_quantity");
        const quantity = Number(opening);
        const location_UUID = get_text("initial_stock_area");
        if (!initial_values) {
            if (!opening || !Number.isSafeInteger(quantity) || quantity < 0) {
                next_errors.initial_stock_quantity =
                    "Enter a whole number of 0 or more.";
            } else if (quantity > 0) {
                if (!areas.length) {
                    next_errors.initial_stock_location =
                        "Select a location for the opening quantity.";
                } else if (
                    !areas.some((area) => area.location_UUID === location_UUID)
                ) {
                    next_errors.initial_stock_area =
                        "Select a storage area for the opening quantity.";
                }
            }
        }

        set_errors(next_errors);
        const first_invalid = Array.from(form.elements).find(
            (
                field,
            ): field is
                HTMLInputElement | HTMLSelectElement | HTMLButtonElement =>
                ((field instanceof HTMLInputElement &&
                    field.type !== "hidden") ||
                    field instanceof HTMLSelectElement ||
                    field instanceof HTMLButtonElement) &&
                Boolean(next_errors[field.name as FieldName]),
        );
        if (first_invalid) {
            first_invalid.focus();
            return;
        }

        const saved = await on_submit(
            values,
            !initial_values && quantity > 0
                ? { location_UUID, quantity }
                : undefined,
        );
        if (saved !== false) clear();
    }

    return (
        <form onSubmit={handle_submit} onChange={clear_error} noValidate>
            <div className="space-y-4 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-1">
                    <p className="text-xs text-slate-600">
                        <span className="text-red-700">*</span> indicates a
                        required field.
                    </p>
                    <FeatureHelp title="required fields" guide_id="required" />
                </div>
                {save_error && (
                    <div
                        ref={save_alert}
                        role="alert"
                        tabIndex={-1}
                        className="scroll-mt-20 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"
                    >
                        <p>
                            Item could not be saved. Your entries are kept. Try
                            again.
                        </p>
                        <p className="mt-1 text-xs">{save_error}</p>
                    </div>
                )}
                <fieldset disabled={is_saving} className="min-w-0">
                    <legend className="mb-3 text-sm font-semibold text-[#0b2238]">
                        Item &amp; stock
                    </legend>
                    <div className="grid gap-x-3 gap-y-3 sm:grid-cols-2">
                        <FormField
                            id="part_name"
                            label="Item name"
                            required
                            error={errors.part_name}
                        >
                            {(props) => (
                                <input
                                    {...props}
                                    name="part_name"
                                    placeholder="Enter item name"
                                    maxLength={150}
                                    defaultValue={
                                        draft.part_name ??
                                        initial_values?.part_name ??
                                        ""
                                    }
                                    className={INVENTORY_FORM_INPUT}
                                />
                            )}
                        </FormField>
                        <UnavailableField
                            label="Category"
                            value={item?.category}
                        />
                        <FormField
                            id="part_number"
                            label="Part number"
                            required
                            help="Use the unique part number that identifies this item."
                            error={errors.part_number}
                        >
                            {(props) => (
                                <input
                                    {...props}
                                    name="part_number"
                                    placeholder="Enter part number"
                                    maxLength={50}
                                    defaultValue={
                                        draft.part_number ??
                                        initial_values?.part_number ??
                                        ""
                                    }
                                    className={INVENTORY_FORM_INPUT}
                                />
                            )}
                        </FormField>
                        <InventoryUnitField
                            initial_unit={
                                draft.unit_of_measure ??
                                initial_values?.unit_of_measure
                            }
                            units={units}
                            error={errors.unit_of_measure}
                            on_value_change={(value) => {
                                remember("unit_of_measure", value);
                                clear_field_error("unit_of_measure", value);
                            }}
                        />
                        {initial_values ? (
                            <>
                                <UnavailableField
                                    label="Location"
                                    value={item?.locations
                                        .map(
                                            ({ location_name }) =>
                                                location_name,
                                        )
                                        .join(", ")}
                                />
                                <UnavailableField
                                    label="Storage area"
                                    help={storage_area_help}
                                    value={item?.locations
                                        .map(
                                            ({ storage_area }) =>
                                                storage_area || "—",
                                        )
                                        .join(", ")}
                                />
                                <UnavailableField
                                    label="Current quantity"
                                    value={item && String(item.total_quantity)}
                                />
                            </>
                        ) : (
                            <>
                                <FormField
                                    id="initial_stock_location"
                                    label="Location"
                                    error={errors.initial_stock_location}
                                >
                                    {(props) => (
                                        <select
                                            {...props}
                                            name="initial_stock_location"
                                            value={location_name}
                                            onChange={(event) => {
                                                const value =
                                                    event.currentTarget.value;
                                                set_draft((current) => ({
                                                    ...current,
                                                    initial_stock_location:
                                                        value,
                                                    initial_stock_area: "",
                                                }));
                                            }}
                                            className={INVENTORY_FORM_INPUT}
                                        >
                                            <option value="">
                                                Select a location
                                            </option>
                                            {location_names.map((name) => (
                                                <option key={name} value={name}>
                                                    {name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </FormField>
                                <FormField
                                    id="initial_stock_area"
                                    label="Storage area"
                                    help={storage_area_help}
                                    error={errors.initial_stock_area}
                                >
                                    {(props) => (
                                        <select
                                            {...props}
                                            name="initial_stock_area"
                                            value={selected_area}
                                            onChange={(event) =>
                                                remember(
                                                    "initial_stock_area",
                                                    event.currentTarget.value,
                                                )
                                            }
                                            disabled={!areas.length}
                                            className={INVENTORY_FORM_INPUT}
                                        >
                                            <option value="">
                                                {areas.length
                                                    ? "Select a storage area"
                                                    : "Select a location first"}
                                            </option>
                                            {areas.map(
                                                ({
                                                    location_UUID,
                                                    storage_area,
                                                }) => (
                                                    <option
                                                        key={location_UUID}
                                                        value={location_UUID}
                                                    >
                                                        {storage_area ||
                                                            "No storage area recorded"}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    )}
                                </FormField>
                                <InventoryQuantityField
                                    name="initial_stock_quantity"
                                    label="Opening quantity"
                                    help="Enter the starting quantity at the selected location. Use 0 to add the item without stock."
                                    default_value={
                                        draft.initial_stock_quantity ?? 0
                                    }
                                    error={errors.initial_stock_quantity}
                                    on_value_change={(value) => {
                                        remember(
                                            "initial_stock_quantity",
                                            value,
                                        );
                                        clear_field_error(
                                            "initial_stock_quantity",
                                            value,
                                        );
                                    }}
                                />
                            </>
                        )}
                        <InventoryQuantityField
                            name="min_stock_level"
                            label="Minimum stock level"
                            help="The item is marked Low stock when its total quantity falls below this number."
                            default_value={
                                draft.min_stock_level ??
                                initial_values?.min_stock_level ??
                                0
                            }
                            error={errors.min_stock_level}
                            on_value_change={(value) => {
                                remember("min_stock_level", value);
                                clear_field_error("min_stock_level", value);
                            }}
                        />
                        <UnavailableField
                            label="Expiry date"
                            help="Expiry dates are read-only in this form."
                            value={item && format_inventory_expiry(item)}
                            icon={CalendarDays}
                        />
                    </div>
                </fieldset>

                <details className="group border-t border-slate-200">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded text-sm font-semibold text-[#0b2238] focus-visible:outline-2 focus-visible:outline-[#1d4ed8] [&::-webkit-details-marker]:hidden">
                        Additional information
                        <ChevronDown
                            size={16}
                            className="group-open:rotate-180"
                            aria-hidden="true"
                        />
                    </summary>
                    <fieldset
                        disabled={is_saving}
                        className="grid min-w-0 gap-3 pb-2 sm:grid-cols-2"
                    >
                        <legend className="sr-only">
                            Additional information
                        </legend>
                        <div className="sm:col-span-2">
                            <FormField id="description" label="Description">
                                {(props) => (
                                    <textarea
                                        {...props}
                                        name="description"
                                        placeholder="Enter a short description (optional)"
                                        maxLength={500}
                                        rows={2}
                                        defaultValue={
                                            draft.description ??
                                            initial_values?.description ??
                                            ""
                                        }
                                        className={INVENTORY_FORM_INPUT}
                                    />
                                )}
                            </FormField>
                        </div>
                        <UnavailableField
                            label="Serial number"
                            help="Serial numbers are read-only in this form."
                        />
                        <UnavailableField
                            label="Manufacturer"
                            value={item?.manufacturers.join(", ")}
                            help="Setting a manufacturer is not available yet."
                        />
                        <UnavailableField
                            label="Supplier"
                            value={item?.suppliers.join(", ")}
                            help="Setting a supplier is not available yet."
                        />
                    </fieldset>
                </details>
            </div>

            <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
                <Button
                    variant="secondary"
                    className="mr-auto"
                    onClick={() => {
                        clear();
                        on_cancel();
                    }}
                    disabled={is_saving}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    is_loading={is_saving}
                    className={`min-w-24 ${INVENTORY_PRIMARY_ACTION}`}
                >
                    Save
                </Button>
            </div>
        </form>
    );
}

function UnavailableField({
    label,
    value,
    help,
    icon: Icon,
}: {
    label: string;
    value?: string | null;
    help?: string;
    icon?: LucideIcon;
}) {
    return (
        <FormField label={label} help={help}>
            {(props) => (
                <div className="relative">
                    <input
                        {...props}
                        value={value || "Unavailable"}
                        disabled
                        className={`${INVENTORY_FORM_INPUT}${Icon ? " pr-10" : ""}`}
                    />
                    {Icon && (
                        <Icon
                            size={16}
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-500"
                        />
                    )}
                </div>
            )}
        </FormField>
    );
}
