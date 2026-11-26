import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import DetailsList from "../../../shared/components/ui/details_list";
import { usePersonnelDirectory } from "../hooks/use_personnel_directory";
import usePersonnelLookups from "../hooks/use_personnel_lookups";
import type { PersonnelInput } from "../types/personnel_types";
import { personnel_date } from "../utils/personnel_records";

const input_style =
    "min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8] aria-invalid:border-red-500 disabled:bg-slate-100 disabled:text-slate-500";
const required_messages = {
    emp_number: "Enter an employee ID.",
    f_name: "Enter the first name.",
    l_name: "Enter the last name.",
    date_of_birth: "Enter the date of birth.",
    sex: "Select sex.",
    date_hired: "Enter the date hired.",
    department: "Enter a department.",
    position_UUID: "Select a position.",
    base_UUID: "Select an assigned base.",
    emp_status_UUID: "Select an employment status.",
    personnel_category_UUID: "Select a personnel category.",
};
const personal_fields = new Set<keyof PersonnelInput>([
    "f_name",
    "m_name",
    "l_name",
    "suffix",
    "date_of_birth",
    "sex",
    "blood_type",
    "photo",
]);
const steps = ["Personal information", "Work information", "Review"];

export default function PersonnelFormPage() {
    const { rows, can_manage, save } = usePersonnelDirectory();
    const { personnel_id } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const record = rows.find((row) => row.id === personnel_id);
    const initial = record?.employee;
    const lookups = usePersonnelLookups();
    const [errors, set_errors] = useState<
        Partial<Record<keyof PersonnelInput, string>>
    >({});
    const [save_error, set_save_error] = useState("");
    const [is_saving, set_is_saving] = useState(false);
    const [step, set_step] = useState(0);
    const [review_values, set_review_values] = useState<PersonnelInput | null>(
        null,
    );
    const step_heading = useRef<HTMLHeadingElement>(null);
    const saving = useRef(false);
    useEffect(() => {
        step_heading.current?.focus();
    }, [step]);
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
        if (saving.current || !lookups.data) return;
        if (step === 2) {
            void confirm_save();
            return;
        }
        const form = event.currentTarget;
        const data = new FormData(form);
        const read = (key: keyof PersonnelInput) =>
            String(data.get(key) ?? "").trim();
        const values: PersonnelInput = {
            emp_number: read("emp_number").toUpperCase(),
            f_name: read("f_name"),
            m_name: read("m_name") || null,
            l_name: read("l_name"),
            suffix: read("suffix") || null,
            date_of_birth: read("date_of_birth"),
            sex: read("sex") as PersonnelInput["sex"],
            date_hired: read("date_hired"),
            department: read("department"),
            base_UUID: read("base_UUID"),
            emp_status_UUID: read("emp_status_UUID"),
            position_UUID: read("position_UUID"),
            personnel_category_UUID: read("personnel_category_UUID"),
            record_status: read(
                "record_status",
            ) as PersonnelInput["record_status"],
            blood_type: read("blood_type") || null,
            photo: read("photo") || null,
            supervisor_emp_UUID: read("supervisor_emp_UUID") || null,
        };
        const next_errors: typeof errors = {};
        for (const [key, message] of Object.entries(required_messages) as [
            keyof typeof required_messages,
            string,
        ][]) {
            if (step === 0 && !personal_fields.has(key)) continue;
            if (!values[key]) next_errors[key] = message;
        }
        if (
            step === 1 &&
            values.emp_number &&
            (!/^SA-\d{4,}$/.test(values.emp_number) ||
                values.emp_number.length > 20)
        )
            next_errors.emp_number =
                "Use an employee ID like SA-0001 (at most 20 characters).";
        if (values.date_of_birth > new Date().toISOString().slice(0, 10))
            next_errors.date_of_birth =
                "Date of birth cannot be in the future.";
        if (
            step === 1 &&
            values.date_of_birth &&
            values.date_hired &&
            values.date_hired < values.date_of_birth
        )
            next_errors.date_hired =
                "Date hired cannot be before the date of birth.";
        set_errors(next_errors);
        set_save_error("");
        const first_error = Object.keys(next_errors)[0];
        if (first_error) {
            if (personal_fields.has(first_error as keyof PersonnelInput))
                set_step(0);
            const field = form.elements.namedItem(first_error);
            if (field instanceof HTMLElement) field.focus();
            return;
        }
        if (step === 0) {
            set_step(1);
            return;
        }
        set_review_values(values);
        set_step(2);
    }

    async function confirm_save() {
        if (!review_values || saving.current) return;
        saving.current = true;
        set_is_saving(true);
        try {
            const id = await save(review_values, record?.id);
            toast.success(record ? "Personnel updated." : "Personnel added.", {
                position: "bottom-right",
            });
            void navigate(
                record ? destination : `/personnel/${encodeURIComponent(id)}`,
                { replace: true },
            );
        } catch (cause) {
            set_save_error(
                cause instanceof Error
                    ? cause.message
                    : "Unable to save personnel. Your entries are kept.",
            );
        } finally {
            saving.current = false;
            set_is_saving(false);
        }
    }

    function text_field(
        key: keyof PersonnelInput,
        label: string,
        type = "text",
        required = false,
        max_length = 100,
    ) {
        return (
            <FormField label={label} required={required} error={errors[key]}>
                {(props) => (
                    <input
                        {...props}
                        name={key}
                        type={type}
                        maxLength={max_length}
                        required={required}
                        defaultValue={initial?.[key] ?? ""}
                        placeholder={
                            key === "emp_number" ? "SA-0001" : undefined
                        }
                        max={
                            key === "date_of_birth"
                                ? new Date().toISOString().slice(0, 10)
                                : undefined
                        }
                        className={input_style}
                    />
                )}
            </FormField>
        );
    }

    function select_field(
        key: keyof PersonnelInput,
        label: string,
        options: { id: string; name: string }[],
        required = false,
        fallback = "",
    ) {
        const selected =
            initial?.[key] ?? (key === "record_status" ? "Active" : "");
        const available =
            selected && !options.some((option) => option.id === selected)
                ? [...options, { id: selected, name: fallback || selected }]
                : options;
        return (
            <FormField label={label} required={required} error={errors[key]}>
                {(props) => (
                    <div className="relative">
                        <select
                            {...props}
                            name={key}
                            defaultValue={selected}
                            required={required}
                            className={`${input_style} appearance-none pr-9`}
                        >
                            <option value="">
                                {required
                                    ? `Select ${label.toLowerCase()}`
                                    : "Not recorded"}
                            </option>
                            {available.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            size={16}
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-500"
                        />
                    </div>
                )}
            </FormField>
        );
    }

    const options = lookups.data;
    const missing_options =
        options &&
        (!options.positions.length ||
            !options.bases.length ||
            !options.employment_statuses.length ||
            !options.personnel_categories.length);
    return (
        <FormDialog
            title={record ? "Edit personnel record" : "Add personnel record"}
            compact
            max_width="2xl"
            is_busy={is_saving}
            on_close={close}
        >
            {lookups.loading ? (
                <ScreenLoading compact label="Loading personnel options..." />
            ) : lookups.error ? (
                <div role="alert" className="space-y-3 p-5">
                    <p className="text-sm text-red-700">{lookups.error}</p>
                    <Button variant="secondary" onClick={lookups.reload}>
                        Try again
                    </Button>
                </div>
            ) : (
                options && (
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
                            const key = field.name as keyof PersonnelInput;
                            if (errors[key])
                                set_errors((current) => ({
                                    ...current,
                                    [key]: undefined,
                                }));
                            if (save_error) set_save_error("");
                            set_review_values(null);
                        }}
                    >
                        <div className="space-y-4 px-4 py-4 sm:px-5">
                            <ol
                                aria-label="Personnel entry steps"
                                className="grid grid-cols-3 gap-3 border-b border-slate-200 pb-4"
                            >
                                {steps.map((label, index) => (
                                    <li
                                        key={label}
                                        aria-current={
                                            index === step ? "step" : undefined
                                        }
                                        className="flex flex-col items-center gap-2 text-center"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`grid size-9 place-items-center rounded-full border text-sm font-semibold ${index === step ? "border-[#0b2238] bg-[#0b2238] text-white" : index < step ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-white text-slate-500"}`}
                                        >
                                            {index + 1}
                                        </span>
                                        <span
                                            className={`text-xs font-medium ${index === step ? "text-[#0b2238]" : "text-slate-500"}`}
                                        >
                                            {label}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                            <h3
                                ref={step_heading}
                                tabIndex={-1}
                                className="text-sm font-semibold text-[#0b2238] focus:outline-none"
                            >
                                {step < 2
                                    ? `Page ${step + 1} of 2: ${steps[step]}`
                                    : "Review personnel entry"}
                            </h3>
                            {step < 2 && (
                                <p className="text-xs text-slate-600">
                                    <span className="text-red-700">*</span>{" "}
                                    indicates a required field.
                                </p>
                            )}
                            {missing_options && (
                                <p
                                    role="alert"
                                    className="rounded-md bg-amber-50 p-3 text-sm text-amber-900"
                                >
                                    Some personnel options are unavailable. A
                                    base, position, employment status, and
                                    category must exist before a record can be
                                    added.
                                </p>
                            )}
                            {save_error && (
                                <p
                                    role="alert"
                                    className="rounded-md bg-red-50 p-3 text-sm text-red-700"
                                >
                                    {save_error} Your entries are kept.
                                </p>
                            )}
                            <fieldset
                                disabled={is_saving}
                                hidden={step !== 0}
                                className={`${step === 0 ? "grid" : "hidden"} min-w-0 gap-3 sm:grid-cols-2`}
                            >
                                <legend className="sr-only">
                                    Personal information
                                </legend>
                                {text_field(
                                    "f_name",
                                    "First name",
                                    "text",
                                    true,
                                )}
                                {text_field("m_name", "Middle name")}
                                {text_field(
                                    "l_name",
                                    "Last name",
                                    "text",
                                    true,
                                )}
                                {text_field(
                                    "suffix",
                                    "Suffix",
                                    "text",
                                    false,
                                    20,
                                )}
                                {text_field(
                                    "date_of_birth",
                                    "Date of birth",
                                    "date",
                                    true,
                                )}
                                {select_field(
                                    "sex",
                                    "Sex",
                                    ["Male", "Female"].map((name) => ({
                                        id: name,
                                        name,
                                    })),
                                    true,
                                )}
                                {select_field(
                                    "blood_type",
                                    "Blood type",
                                    [
                                        "A+",
                                        "A-",
                                        "B+",
                                        "B-",
                                        "AB+",
                                        "AB-",
                                        "O+",
                                        "O-",
                                    ].map((name) => ({ id: name, name })),
                                )}
                                <div className="sm:col-span-2">
                                    {text_field(
                                        "photo",
                                        "Photo URL / path",
                                        "text",
                                        false,
                                        500,
                                    )}
                                </div>
                            </fieldset>
                            <fieldset
                                disabled={is_saving}
                                hidden={step !== 1}
                                className={`${step === 1 ? "grid" : "hidden"} min-w-0 gap-3 sm:grid-cols-2`}
                            >
                                <legend className="sr-only">
                                    Work information
                                </legend>
                                {text_field(
                                    "emp_number",
                                    "Employee ID",
                                    "text",
                                    true,
                                    20,
                                )}
                                {text_field(
                                    "department",
                                    "Department",
                                    "text",
                                    true,
                                )}
                                {select_field(
                                    "position_UUID",
                                    "Position",
                                    options.positions.map((row) => ({
                                        id: row.position_UUID,
                                        name: row.position_name,
                                    })),
                                    true,
                                    record?.position,
                                )}
                                {select_field(
                                    "emp_status_UUID",
                                    "Employment status",
                                    options.employment_statuses.map((row) => ({
                                        id: row.emp_status_UUID,
                                        name: row.status_name,
                                    })),
                                    true,
                                    record?.employment_status,
                                )}
                                {select_field(
                                    "base_UUID",
                                    "Assigned base",
                                    options.bases.map((row) => ({
                                        id: row.base_UUID,
                                        name: row.base_name,
                                    })),
                                    true,
                                    record?.base,
                                )}
                                {select_field(
                                    "personnel_category_UUID",
                                    "Personnel category",
                                    options.personnel_categories.map((row) => ({
                                        id: row.personnel_category_UUID,
                                        name: row.category_name,
                                    })),
                                    true,
                                    record?.category,
                                )}
                                {text_field(
                                    "date_hired",
                                    "Date hired",
                                    "date",
                                    true,
                                )}
                                {select_field(
                                    "record_status",
                                    "Record status",
                                    ["Active", "Inactive"].map((name) => ({
                                        id: name,
                                        name,
                                    })),
                                    true,
                                )}
                                {select_field(
                                    "supervisor_emp_UUID",
                                    "Supervisor",
                                    rows
                                        .filter(
                                            (row) =>
                                                row.id !== record?.id &&
                                                row.record_status === "Active",
                                        )
                                        .map((row) => ({
                                            id: row.id,
                                            name: row.name,
                                        })),
                                    false,
                                    rows.find(
                                        (row) =>
                                            row.id ===
                                            initial?.supervisor_emp_UUID,
                                    )?.name,
                                )}
                                <FormField label="Work email">
                                    {(props) => (
                                        <input
                                            {...props}
                                            name="email"
                                            disabled
                                            value={
                                                record?.email || "Unavailable"
                                            }
                                            className={input_style}
                                        />
                                    )}
                                </FormField>
                                <FormField label="Contact number">
                                    {(props) => (
                                        <input
                                            {...props}
                                            name="phone"
                                            disabled
                                            value={
                                                record?.phone || "Unavailable"
                                            }
                                            className={input_style}
                                        />
                                    )}
                                </FormField>
                            </fieldset>
                            {step === 2 && review_values && (
                                <div className="space-y-5">
                                    <section
                                        className="space-y-3"
                                        aria-label="Review personal information"
                                    >
                                        <h4 className="text-sm font-semibold">
                                            Personal information
                                        </h4>
                                        <DetailsList
                                            entries={[
                                                {
                                                    id: "first",
                                                    label: "First name",
                                                    value: review_values.f_name,
                                                },
                                                {
                                                    id: "middle",
                                                    label: "Middle name",
                                                    value:
                                                        review_values.m_name ||
                                                        "Not recorded",
                                                },
                                                {
                                                    id: "last",
                                                    label: "Last name",
                                                    value: review_values.l_name,
                                                },
                                                {
                                                    id: "suffix",
                                                    label: "Suffix",
                                                    value:
                                                        review_values.suffix ||
                                                        "Not recorded",
                                                },
                                                {
                                                    id: "birth",
                                                    label: "Date of birth",
                                                    value: personnel_date(
                                                        review_values.date_of_birth,
                                                    ),
                                                },
                                                {
                                                    id: "sex",
                                                    label: "Sex",
                                                    value: review_values.sex,
                                                },
                                                {
                                                    id: "blood",
                                                    label: "Blood type",
                                                    value:
                                                        review_values.blood_type ||
                                                        "Not recorded",
                                                },
                                                {
                                                    id: "photo",
                                                    label: "Photo URL / path",
                                                    value:
                                                        review_values.photo ||
                                                        "Not recorded",
                                                },
                                            ]}
                                        />
                                    </section>
                                    <section
                                        className="space-y-3 border-t border-slate-200 pt-4"
                                        aria-label="Review work information"
                                    >
                                        <h4 className="text-sm font-semibold">
                                            Work information
                                        </h4>
                                        <DetailsList
                                            entries={[
                                                {
                                                    id: "number",
                                                    label: "Employee ID",
                                                    value: review_values.emp_number,
                                                },
                                                {
                                                    id: "department",
                                                    label: "Department",
                                                    value: review_values.department,
                                                },
                                                {
                                                    id: "position",
                                                    label: "Position",
                                                    value:
                                                        options.positions.find(
                                                            (row) =>
                                                                row.position_UUID ===
                                                                review_values.position_UUID,
                                                        )?.position_name ||
                                                        record?.position ||
                                                        "Not recorded",
                                                },
                                                {
                                                    id: "status",
                                                    label: "Employment status",
                                                    value:
                                                        options.employment_statuses.find(
                                                            (row) =>
                                                                row.emp_status_UUID ===
                                                                review_values.emp_status_UUID,
                                                        )?.status_name ||
                                                        record?.employment_status ||
                                                        "Not recorded",
                                                },
                                                {
                                                    id: "base",
                                                    label: "Assigned base",
                                                    value:
                                                        options.bases.find(
                                                            (row) =>
                                                                row.base_UUID ===
                                                                review_values.base_UUID,
                                                        )?.base_name ||
                                                        record?.base ||
                                                        "Not recorded",
                                                },
                                                {
                                                    id: "category",
                                                    label: "Personnel category",
                                                    value:
                                                        options.personnel_categories.find(
                                                            (row) =>
                                                                row.personnel_category_UUID ===
                                                                review_values.personnel_category_UUID,
                                                        )?.category_name ||
                                                        record?.category ||
                                                        "Not recorded",
                                                },
                                                {
                                                    id: "hired",
                                                    label: "Date hired",
                                                    value: personnel_date(
                                                        review_values.date_hired,
                                                    ),
                                                },
                                                {
                                                    id: "record",
                                                    label: "Record status",
                                                    value: review_values.record_status,
                                                },
                                                {
                                                    id: "supervisor",
                                                    label: "Supervisor",
                                                    value:
                                                        rows.find(
                                                            (row) =>
                                                                row.id ===
                                                                review_values.supervisor_emp_UUID,
                                                        )?.name ||
                                                        "Not recorded",
                                                },
                                                {
                                                    id: "email",
                                                    label: "Work email",
                                                    value:
                                                        record?.email ||
                                                        "Unavailable",
                                                },
                                                {
                                                    id: "phone",
                                                    label: "Contact number",
                                                    value:
                                                        record?.phone ||
                                                        "Unavailable",
                                                },
                                            ]}
                                        />
                                    </section>
                                </div>
                            )}
                        </div>
                        <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
                            <Button
                                variant="secondary"
                                className="mr-auto"
                                onClick={close}
                                disabled={is_saving}
                            >
                                Cancel
                            </Button>
                            {step > 0 && (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        set_step((current) => current - 1);
                                        set_save_error("");
                                    }}
                                    disabled={is_saving}
                                >
                                    Back
                                </Button>
                            )}
                            <Button
                                type="submit"
                                is_loading={is_saving}
                                disabled={Boolean(missing_options) && !record}
                                className="bg-[#0b2238]! hover:bg-[#193951]!"
                            >
                                {step === 0
                                    ? "Next"
                                    : step === 1
                                      ? "Review entry"
                                      : "Save personnel"}
                            </Button>
                        </div>
                    </form>
                )
            )}
        </FormDialog>
    );
}
