import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import { INVENTORY_PRIMARY_ACTION } from "../constants/inventory_constants";
import { INVENTORY_FORM_INPUT } from "../constants/inventory_form_constants";
import { MAX_LOCATION_QUANTITY } from "../constants/inventory_workflow_constants";

export function WorkflowInput({
    name,
    label,
    required = false,
    type = "text",
    default_value,
    placeholder,
    multiline = false,
    min = 1,
    rows = 2,
    unavailable = false,
}: {
    name: string;
    label: string;
    required?: boolean;
    type?: "text" | "date" | "number";
    default_value?: string | number;
    placeholder?: string;
    multiline?: boolean;
    min?: number;
    rows?: number;
    unavailable?: boolean;
}) {
    return (
        <FormField label={label} required={required && !unavailable}>
            {(props) =>
                multiline ? (
                    <textarea
                        {...props}
                        name={name}
                        defaultValue={
                            unavailable ? "Unavailable" : default_value
                        }
                        placeholder={placeholder}
                        disabled={unavailable}
                        className={`${INVENTORY_FORM_INPUT} resize-y`}
                        maxLength={500}
                        rows={rows}
                    />
                ) : (
                    <input
                        {...props}
                        name={name}
                        type={unavailable ? "text" : type}
                        defaultValue={
                            unavailable ? "Unavailable" : default_value
                        }
                        placeholder={placeholder}
                        disabled={unavailable}
                        className={INVENTORY_FORM_INPUT}
                        maxLength={type === "text" ? 150 : undefined}
                        min={type === "number" ? min : undefined}
                        max={
                            type === "number"
                                ? MAX_LOCATION_QUANTITY
                                : undefined
                        }
                    />
                )
            }
        </FormField>
    );
}

export function WorkflowSelect({
    label,
    required = false,
    name,
    default_value,
    value,
    on_change,
    children,
}: {
    label: string;
    required?: boolean;
    name?: string;
    default_value?: string;
    value?: string;
    on_change?: (value: string) => void;
    children: ReactNode;
}) {
    return (
        <FormField label={label} required={required}>
            {(props) => (
                <div className="relative">
                    <select
                        {...props}
                        name={name}
                        defaultValue={default_value}
                        value={value}
                        onChange={
                            on_change &&
                            ((event) => on_change(event.currentTarget.value))
                        }
                        className={`${INVENTORY_FORM_INPUT} appearance-none pr-9`}
                    >
                        {children}
                    </select>
                    <ChevronDown
                        size={16}
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-600"
                    />
                </div>
            )}
        </FormField>
    );
}

export function WorkflowActions({
    on_cancel,
    cancel_label = "Cancel",
    label,
    type = "submit",
    on_confirm,
    tone = "primary",
    is_saving = false,
    disabled = false,
}: {
    on_cancel: () => void;
    cancel_label?: string;
    label: string;
    type?: "submit" | "button";
    on_confirm?: () => void;
    tone?: "primary" | "danger" | "success";
    is_saving?: boolean;
    disabled?: boolean;
}) {
    return (
        <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
            <Button
                variant="secondary"
                className={`cursor-pointer ${cancel_label === "Cancel" ? "mr-auto" : ""}`}
                onClick={on_cancel}
                disabled={is_saving}
            >
                {cancel_label}
            </Button>
            <Button
                type={type}
                variant={tone === "danger" ? "danger" : "primary"}
                className={`cursor-pointer ${tone === "primary" ? INVENTORY_PRIMARY_ACTION : tone === "success" ? "bg-emerald-700! hover:bg-emerald-800!" : ""}`}
                onClick={on_confirm}
                is_loading={is_saving}
                disabled={disabled}
            >
                {label}
            </Button>
        </div>
    );
}

export function WorkflowNotice({ children }: { children: ReactNode }) {
    return (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {children}
        </p>
    );
}

export function WorkflowError({ message }: { message: string | null }) {
    if (!message) return null;
    return (
        <p
            role="alert"
            className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"
        >
            {message}
        </p>
    );
}
