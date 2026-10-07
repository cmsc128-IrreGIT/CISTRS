import { useId } from "react";
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
    error?: string;
    children: (props: FieldControlProps) => ReactNode;
};

export default function FormField({
    label,
    id,
    required = false,
    hint,
    error,
    children,
}: FormFieldProps) {
    const generated_id = useId();
    const field_id = id ?? generated_id;
    const hint_id = `${field_id}_hint`;
    const error_id = `${field_id}_error`;
    const described_by =
        [hint ? hint_id : "", error ? error_id : ""]
            .filter(Boolean)
            .join(" ") || undefined;

    return (
        <div>
            <label
                htmlFor={field_id}
                className="mb-2 block text-sm font-medium text-slate-700"
            >
                {label}
                {required ? " *" : ""}
            </label>

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
