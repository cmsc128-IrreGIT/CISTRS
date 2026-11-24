import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { SubmitEvent } from "react";
import {
    Navigate,
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router";
import { toast } from "sonner";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import FormDialog from "../../../shared/components/ui/form_dialog";
import { seeded_positions } from "../config/seeded_positions";
import { usePersonnelDirectory } from "../hooks/use_personnel_directory";
import type { PersonnelFormValues } from "../types/personnel_types";
import { personnel_options } from "../utils/personnel_records";

const input_style =
    "min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8] aria-invalid:border-red-500";
const required_messages = {
    name: "Enter the full name.",
    employee_number: "Enter the employee ID.",
    position: "Select a position.",
    department: "Choose or enter a department.",
    employment_status: "Select an employment status.",
};

export default function PersonnelFormPage() {
    const { rows, can_manage, save } = usePersonnelDirectory();
    const { personnel_id } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [errors, set_errors] = useState<
        Partial<Record<keyof PersonnelFormValues, string>>
    >({});
    const [save_error, set_save_error] = useState("");
    const record = rows.find((row) => row.id === personnel_id);
    const destination = record
        ? `/personnel/${encodeURIComponent(record.id)}${params.size ? `?${params}` : ""}`
        : "/personnel";

    if (!can_manage) return <Navigate to="/403" replace />;
    if (personnel_id && !record)
        return (
            <Navigate
                to={`/personnel/${encodeURIComponent(personnel_id)}`}
                replace
            />
        );

    function close() {
        void navigate(destination, { replace: true });
    }

    function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const read = (key: keyof PersonnelFormValues) =>
            String(data.get(key) ?? "").trim();
        const values: PersonnelFormValues = {
            name: read("name"),
            employee_number: read("employee_number"),
            position: read("position"),
            department: read("department"),
            email: read("email"),
            phone: read("phone"),
            employment_status: read("employment_status"),
        };

        const next_errors: typeof errors = {};
        for (const [key, message] of Object.entries(required_messages) as [
            keyof typeof required_messages,
            string,
        ][]) {
            if (!values[key]) next_errors[key] = message;
        }
        const email = form.elements.namedItem("email");
        if (
            values.email &&
            email instanceof HTMLInputElement &&
            email.validity.typeMismatch
        ) {
            next_errors.email = "Enter a valid work email.";
        }
        set_errors(next_errors);
        set_save_error("");
        const first_error = Object.keys(next_errors)[0];
        if (first_error) {
            const field = form.elements.namedItem(first_error);
            if (field instanceof HTMLElement) field.focus();
            return;
        }

        try {
            const id = save(values, record?.id);
            toast.success("Personnel preview saved", {
                position: "bottom-right",
            });
            void navigate(
                record ? destination : `/personnel/${encodeURIComponent(id)}`,
                {
                    replace: true,
                },
            );
        } catch (error) {
            set_save_error(
                error instanceof Error
                    ? error.message
                    : "Unable to save the personnel preview.",
            );
        }
    }

    function select_field(
        key: "position" | "department" | "employment_status",
        label: string,
        placeholder: string,
        preview_options: string[] = [],
    ) {
        const options = personnel_options(rows, key, preview_options);
        if (key === "department" && options.length === 0) {
            return (
                <FormField label={label} required error={errors[key]}>
                    {(props) => (
                        <input
                            {...props}
                            name={key}
                            maxLength={120}
                            placeholder="Enter department"
                            className={input_style}
                        />
                    )}
                </FormField>
            );
        }
        const saved_value = record?.[key].trim().toLowerCase();
        const selected =
            options.find(
                (option) => option.trim().toLowerCase() === saved_value,
            ) ?? "";
        return (
            <FormField label={label} required error={errors[key]}>
                {(props) => (
                    <div className="relative">
                        <select
                            {...props}
                            name={key}
                            className={`${input_style} appearance-none pr-9`}
                            defaultValue={selected}
                        >
                            <option value="" disabled hidden>
                                {placeholder}
                            </option>
                            {options.map((option) => (
                                <option key={option}>{option}</option>
                            ))}
                        </select>
                        <ChevronDown
                            size={16}
                            aria-hidden="true"
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"
                        />
                    </div>
                )}
            </FormField>
        );
    }

    return (
        <FormDialog
            title={record ? "Edit personnel record" : "Add personnel record"}
            compact
            on_close={close}
        >
            <form
                noValidate
                onSubmit={submit}
                onChange={(event) => {
                    const field = event.target;
                    if (!(
                        field instanceof HTMLInputElement ||
                        field instanceof HTMLSelectElement
                    ))
                        return;
                    const key = field.name as keyof PersonnelFormValues;
                    if (errors[key])
                        set_errors((current) => ({
                            ...current,
                            [key]: undefined,
                        }));
                    if (save_error) set_save_error("");
                }}
            >
                <div className="min-h-80 space-y-4 px-4 pt-3 pb-6 sm:px-5">
                    <p className="text-xs text-slate-600">
                        <span className="text-red-700">*</span> indicates a
                        required field.
                    </p>
                    <p className="text-xs text-slate-600">
                        Preview changes reset when you reload.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <FormField
                            label="Full name"
                            required
                            error={errors.name}
                        >
                            {(props) => (
                                <input
                                    {...props}
                                    name="name"
                                    autoComplete="name"
                                    maxLength={160}
                                    defaultValue={record?.name}
                                    placeholder="Enter full name"
                                    className={input_style}
                                />
                            )}
                        </FormField>
                        <FormField
                            label="Employee ID"
                            required
                            error={errors.employee_number}
                        >
                            {(props) => (
                                <input
                                    {...props}
                                    name="employee_number"
                                    maxLength={60}
                                    defaultValue={record?.employee_number}
                                    placeholder="Enter employee ID"
                                    className={input_style}
                                />
                            )}
                        </FormField>
                        {select_field(
                            "position",
                            "Position",
                            "Select position",
                            [...seeded_positions.values()],
                        )}
                        {select_field(
                            "department",
                            "Department",
                            "Select department",
                        )}
                        <FormField label="Work email" error={errors.email}>
                            {(props) => (
                                <input
                                    {...props}
                                    name="email"
                                    type="email"
                                    maxLength={254}
                                    autoComplete="email"
                                    defaultValue={record?.email}
                                    placeholder="Optional"
                                    className={input_style}
                                />
                            )}
                        </FormField>
                        <FormField label="Contact number">
                            {(props) => (
                                <input
                                    {...props}
                                    name="phone"
                                    type="tel"
                                    maxLength={40}
                                    autoComplete="tel"
                                    defaultValue={record?.phone}
                                    placeholder="Optional"
                                    className={input_style}
                                />
                            )}
                        </FormField>
                        {select_field(
                            "employment_status",
                            "Employment status",
                            "Select employment status",
                            ["Active", "Inactive"],
                        )}
                    </div>
                    {save_error && (
                        <p
                            role="alert"
                            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                        >
                            {save_error}
                        </p>
                    )}
                </div>
                <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
                    <Button variant="secondary" onClick={close}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="bg-[#0b2238]! hover:bg-[#193951]!"
                    >
                        Save personnel
                    </Button>
                </div>
            </form>
        </FormDialog>
    );
}
