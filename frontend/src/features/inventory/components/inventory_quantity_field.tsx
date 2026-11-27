import { ChevronDown, ChevronUp } from "lucide-react";
import { useRef } from "react";
import FormField from "../../../shared/components/forms/form_field";
import { INVENTORY_FORM_INPUT } from "../constants/inventory_form_constants";

export default function InventoryQuantityField({
    name,
    label,
    default_value,
    placeholder,
    help,
    error,
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    on_value_change,
}: {
    name: string;
    label: string;
    default_value?: number | string;
    placeholder?: string;
    help?: string;
    error?: string;
    min?: number;
    max?: number;
    on_value_change?: (value: string) => void;
}) {
    const input = useRef<HTMLInputElement>(null);

    function step(direction: "up" | "down") {
        const field = input.current;
        if (!field) return;
        if (direction === "up") field.stepUp();
        else field.stepDown();
        on_value_change?.(field.value);
    }

    return (
        <FormField id={name} label={label} required help={help} error={error}>
            {(props) => (
                <div className="relative">
                    <input
                        {...props}
                        ref={input}
                        name={name}
                        type="number"
                        min={min}
                        max={max}
                        step="1"
                        defaultValue={default_value}
                        placeholder={placeholder}
                        onChange={
                            on_value_change &&
                            ((event) =>
                                on_value_change(event.currentTarget.value))
                        }
                        className={`${INVENTORY_FORM_INPUT} appearance-none pr-10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                    />
                    <div className="absolute inset-y-px right-px flex w-9 flex-col justify-center rounded-r-md">
                        <button
                            type="button"
                            aria-label={`Increase ${label.toLowerCase()}`}
                            onClick={() => step("up")}
                            className="flex min-h-5 flex-1 items-center justify-center rounded-tr-md text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#1d4ed8] disabled:text-slate-400"
                        >
                            <ChevronUp size={14} aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            aria-label={`Decrease ${label.toLowerCase()}`}
                            onClick={() => step("down")}
                            className="flex min-h-5 flex-1 items-center justify-center rounded-br-md text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#1d4ed8] disabled:text-slate-400"
                        >
                            <ChevronDown size={14} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            )}
        </FormField>
    );
}
