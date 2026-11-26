import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import FormField from "../../../shared/components/forms/form_field";
import { INVENTORY_FORM_INPUT } from "../constants/inventory_form_constants";

const field_name = "unit_of_measure";

export default function InventoryUnitField({
    initial_unit = "",
    units,
    error,
    on_select,
}: {
    initial_unit?: string;
    units: string[];
    error?: string;
    on_select: () => void;
}) {
    const [unit, set_unit] = useState(initial_unit);
    const [open, set_open] = useState(false);
    const [custom, set_custom] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const custom_input = useRef<HTMLInputElement>(null);
    const options = [...new Set([...units, initial_unit].filter(Boolean))];

    useEffect(() => {
        if (custom) custom_input.current?.focus();
    }, [custom]);

    useEffect(() => {
        if (!open) return;
        function close_outside(event: PointerEvent) {
            if (
                event.target instanceof Node &&
                !root.current?.contains(event.target)
            ) {
                set_open(false);
            }
        }
        document.addEventListener("pointerdown", close_outside);
        return () => document.removeEventListener("pointerdown", close_outside);
    }, [open]);

    function select(value: string, is_custom: boolean) {
        set_unit(value);
        set_custom(is_custom);
        set_open(false);
        on_select();
        trigger.current?.focus();
    }

    return (
        <FormField
            id={field_name}
            label="Unit"
            required
            help="Use the unit you count this item in, such as pcs, box, or set."
            error={error}
        >
            {({
                id,
                "aria-describedby": described_by,
                "aria-invalid": invalid,
            }) => {
                const options_id = `${id}_options`;
                return (
                    <div
                        ref={root}
                        onBlur={(event) => {
                            if (
                                event.relatedTarget &&
                                !event.currentTarget.contains(
                                    event.relatedTarget,
                                )
                            ) {
                                set_open(false);
                            }
                        }}
                        onKeyDown={(event) => {
                            if (!open || event.key !== "Escape") return;
                            event.preventDefault();
                            event.stopPropagation();
                            set_open(false);
                            trigger.current?.focus();
                        }}
                    >
                        <div className="relative">
                            <div
                                className={
                                    custom
                                        ? `flex min-h-10 rounded-md border bg-white focus-within:outline-2 focus-within:outline-[#1d4ed8] ${invalid ? "border-red-500" : "border-slate-200"}`
                                        : undefined
                                }
                            >
                                <button
                                    ref={trigger}
                                    id={id}
                                    name={custom ? undefined : field_name}
                                    type="button"
                                    aria-expanded={open}
                                    aria-controls={options_id}
                                    aria-describedby={described_by}
                                    aria-invalid={
                                        !custom && invalid ? true : undefined
                                    }
                                    onClick={(event) => {
                                        event.currentTarget.focus();
                                        set_open(!open);
                                    }}
                                    className={
                                        custom
                                            ? "flex shrink-0 items-center gap-1.5 rounded-l-md border-r border-slate-200 px-2.5 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#1d4ed8]"
                                            : `${INVENTORY_FORM_INPUT} flex items-center justify-between gap-2 text-left`
                                    }
                                >
                                    <span
                                        className={`min-w-0 wrap-anywhere ${unit || custom ? "" : "text-slate-500"}`}
                                    >
                                        {custom
                                            ? "Other:"
                                            : unit || "Select a unit"}
                                    </span>
                                    <ChevronDown
                                        size={16}
                                        aria-hidden="true"
                                        className="shrink-0 text-slate-500"
                                    />
                                </button>
                                {custom && (
                                    <input
                                        ref={custom_input}
                                        name={field_name}
                                        aria-label="Other unit"
                                        aria-describedby={described_by}
                                        aria-invalid={invalid}
                                        required
                                        maxLength={20}
                                        value={unit}
                                        onChange={(event) =>
                                            set_unit(event.currentTarget.value)
                                        }
                                        placeholder="Enter a unit"
                                        className="min-w-0 flex-1 bg-transparent px-2.5 text-sm text-[#0b2238] outline-none placeholder:text-slate-500 disabled:text-slate-500"
                                    />
                                )}
                            </div>
                            <div
                                id={options_id}
                                role="group"
                                aria-label="Unit options"
                                hidden={!open}
                                className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg"
                            >
                                {options.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        aria-pressed={
                                            !custom && unit === option
                                        }
                                        onClick={() => select(option, false)}
                                        className="block min-h-9 w-full wrap-anywhere rounded px-2 text-left text-sm text-[#0b2238] hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#1d4ed8] aria-pressed:bg-slate-100"
                                    >
                                        {option}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() =>
                                        select(custom ? unit : "", true)
                                    }
                                    className="block min-h-9 w-full rounded px-2 text-left text-sm text-[#0b2238] hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#1d4ed8]"
                                >
                                    Other…
                                </button>
                            </div>
                        </div>
                        {!custom && (
                            <input
                                type="hidden"
                                name={field_name}
                                value={unit}
                            />
                        )}
                    </div>
                );
            }}
        </FormField>
    );
}
