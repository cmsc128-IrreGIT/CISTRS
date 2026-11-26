import { Info } from "lucide-react";
import { useId, useState } from "react";
import type { ReactNode } from "react";

type FieldControlProps = {
    id: string;
    required: boolean;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
};

type FormFieldProps = {
    label: string;
    id?: string;
    required?: boolean;
    hint?: string;
    help?: string;
    error?: string;
    children: (props: FieldControlProps) => ReactNode;
};

export default function FormField({
    label,
    id,
    required = false,
    hint,
    help,
    error,
    children,
}: FormFieldProps) {
    const generated_id = useId();
    const field_id = id ?? generated_id;
    const help_id = `${field_id}_help`;
    const hint_id = `${field_id}_hint`;
    const error_id = `${field_id}_error`;
    const described_by =
        [hint ? hint_id : "", help ? help_id : "", error ? error_id : ""]
            .filter(Boolean)
            .join(" ") || undefined;

    return (
        <div>
            <div className="relative mb-2 flex items-center gap-1">
                <label
                    htmlFor={field_id}
                    className="block text-sm font-medium text-slate-700"
                >
                    {label}
                    {required && (
                        <>
                            {" "}
                            <span className="text-[#c62828]">*</span>
                        </>
                    )}
                </label>
                {help && <FieldHelp id={help_id} label={label} text={help} />}
            </div>

            {children({
                id: field_id,
                required,
                "aria-describedby": described_by,
                "aria-invalid": error ? true : undefined,
            })}

            {hint && (
                <p id={hint_id} className="mt-2 text-xs text-slate-500">
                    {hint}
                </p>
            )}

            {error && (
                <p id={error_id} className="mt-2 text-sm text-red-700">
                    {error}
                </p>
            )}
        </div>
    );
}

function FieldHelp({
    id,
    label,
    text,
}: {
    id: string;
    label: string;
    text: string;
}) {
    const [dismissed, set_dismissed] = useState(false);

    return (
        <span
            className="group/help inline-flex"
            onPointerEnter={() => set_dismissed(false)}
        >
            <button
                type="button"
                aria-label={`About ${label.toLowerCase()}`}
                aria-describedby={id}
                onFocus={() => set_dismissed(false)}
                onClick={(event) => {
                    event.currentTarget.focus();
                    set_dismissed(false);
                }}
                onKeyDown={(event) => {
                    if (event.key !== "Escape" || dismissed) return;
                    event.preventDefault();
                    event.stopPropagation();
                    set_dismissed(true);
                }}
                className="inline-flex size-6 items-center justify-center rounded text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-[#1d4ed8]"
            >
                <Info size={14} aria-hidden="true" />
            </button>
            <span
                id={id}
                role="tooltip"
                className={`invisible absolute top-full left-0 z-20 w-56 max-w-full pt-1 ${dismissed ? "" : "group-hover/help:visible group-focus-within/help:visible"}`}
            >
                <span className="block rounded-md bg-[#0b2238] px-3 py-2 text-xs leading-relaxed font-normal text-white shadow-md">
                    {text}
                </span>
            </span>
        </span>
    );
}
