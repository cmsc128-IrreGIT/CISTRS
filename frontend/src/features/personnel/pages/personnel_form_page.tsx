import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { SubmitEvent } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import FormDialog from "../../../shared/components/ui/form_dialog";
import { usePersonnelDirectory } from "../hooks/use_personnel_directory";
import type { PersonnelEmployeeInput, PersonnelRecord } from "../types/personnel_types";

type ReferenceOption = { id: string; name: string };

const input_style = "min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8] aria-invalid:border-red-500";
const blood_types = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function references(rows: PersonnelRecord[], id: keyof PersonnelRecord, label: keyof PersonnelRecord): ReferenceOption[] {
    const values = rows.flatMap((row) => {
        const key = row[id];
        const name = row[label];
        return typeof key === "string" && key && typeof name === "string" && name
            ? [{ id: key, name }]
            : [];
    });
    return [...new Map(values.map((option) => [option.id, option])).values()]
        .sort((first, second) => first.name.localeCompare(second.name));
}

export default function PersonnelFormPage() {
    const directory = usePersonnelDirectory();
    const { rows, can_manage, save } = directory;
    const { personnel_id } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [saving, set_saving] = useState(false);
    const [save_error, set_save_error] = useState("");
    const record = rows.find((row) => row.id === personnel_id);
    const destination = record ? `/personnel/${encodeURIComponent(record.id)}${params.size ? `?${params}` : ""}` : "/personnel";
    const base_options = references(rows, "base_UUID", "base");
    const status_options = references(rows, "emp_status_UUID", "employment_status");
    const category_options = references(rows, "personnel_category_UUID", "category");
    const position_options = references(rows, "position_UUID", "position");
    const supervisor_options = rows.filter((row) => row.record_status === "Active" && row.id !== record?.id);

    if (!can_manage) return <Navigate to="/403" replace />;
    if (personnel_id && !record) return <Navigate to={`/personnel/${encodeURIComponent(personnel_id)}`} replace />;

    function close() {
        void navigate(destination, { replace: true });
    }

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        set_save_error("");
        const data = new FormData(event.currentTarget);
        const read = (key: string) => String(data.get(key) ?? "").trim();
        const input: PersonnelEmployeeInput = {
            emp_number: read("emp_number"),
            f_name: read("f_name"),
            m_name: read("m_name") || null,
            l_name: read("l_name"),
            suffix: read("suffix") || null,
            date_of_birth: read("date_of_birth"),
            sex: read("sex") as "Male" | "Female",
            blood_type: read("blood_type") || null,
            date_hired: read("date_hired"),
            department: read("department"),
            record_status: read("record_status") as "Active" | "Inactive",
            supervisor_emp_UUID: read("supervisor_emp_UUID") || null,
            base_UUID: read("base_UUID"),
            emp_status_UUID: read("emp_status_UUID"),
            position_UUID: read("position_UUID"),
            personnel_category_UUID: read("personnel_category_UUID"),
        };

        set_saving(true);
        try {
            const id = await save(input, record?.id);
            toast.success(record ? "Personnel record updated" : "Personnel record created", { position: "bottom-right" });
            void navigate(record ? destination : `/personnel/${encodeURIComponent(id)}`, { replace: true });
        } catch (cause) {
            set_save_error(cause instanceof Error ? cause.message : "Unable to save this personnel record.");
        } finally {
            set_saving(false);
        }
    }

    function select_field(name: string, label: string, options: ReferenceOption[], selected = "", required = true) {
        return <FormField key={name} label={label} required={required}>
            {(props) => <div className="relative">
                <select {...props} name={name} required={required} defaultValue={selected} className={`${input_style} appearance-none pr-9`}>
                    <option value="">Select {label.toLowerCase()}</option>
                    {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
                <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600" />
            </div>}
        </FormField>;
    }

    function text_field(name: string, label: string, type = "text", value = "", required = true, max_length?: number) {
        return <FormField key={name} label={label} required={required}>
            {(props) => <input {...props} name={name} type={type} required={required} maxLength={max_length}
                defaultValue={value} className={input_style} />}
        </FormField>;
    }

    const missing_references = !base_options.length || !status_options.length || !category_options.length || !position_options.length;

    return (
        <FormDialog title={record ? "Edit personnel record" : "Add personnel record"} compact on_close={close} is_busy={saving}>
            <form onSubmit={submit}>
                <div className="space-y-4 px-4 pt-3 pb-6 sm:px-5">
                    <p className="text-xs text-slate-600"><span className="text-red-700">*</span> indicates a required field.</p>
                    {missing_references && <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">Some reference choices are not present in the loaded personnel records. The backend has no lookup endpoint for these choices.</p>}
                    <fieldset disabled={saving} className="grid min-w-0 gap-3 sm:grid-cols-2">
                        <legend className="mb-3 font-semibold text-[#0b2238]">Personal information</legend>
                        {text_field("emp_number", "Employee ID", "text", record?.employee_number ?? "", true, 20)}
                        {text_field("f_name", "First name", "text", record?.f_name ?? "", true, 100)}
                        {text_field("m_name", "Middle name", "text", record?.m_name ?? "", false, 100)}
                        {text_field("l_name", "Last name", "text", record?.l_name ?? "", true, 100)}
                        {text_field("suffix", "Suffix", "text", record?.suffix ?? "", false, 20)}
                        {text_field("date_of_birth", "Date of birth", "date", record?.date_of_birth ?? "")}
                        <FormField label="Sex" required>
                            {(props) => <select {...props} name="sex" required defaultValue={record?.sex ?? ""} className={input_style}>
                                <option value="">Select sex</option><option value="Male">Male</option><option value="Female">Female</option>
                            </select>}
                        </FormField>
                        <FormField label="Blood type">
                            {(props) => <select {...props} name="blood_type" defaultValue={record?.blood_type ?? ""} className={input_style}>
                                <option value="">Not recorded</option>{blood_types.map((blood_type) => <option key={blood_type}>{blood_type}</option>)}
                            </select>}
                        </FormField>
                        {text_field("date_hired", "Date hired", "date", record?.date_hired ?? "")}
                    </fieldset>
                    <fieldset disabled={saving} className="grid min-w-0 gap-3 sm:grid-cols-2">
                        <legend className="mb-3 font-semibold text-[#0b2238]">Work information</legend>
                        {text_field("department", "Department", "text", record?.department ?? "", true, 100)}
                        {select_field("base_UUID", "Base", base_options, record?.base_UUID)}
                        {select_field("emp_status_UUID", "Employment status", status_options, record?.emp_status_UUID)}
                        {select_field("position_UUID", "Position", position_options, record?.position_UUID)}
                        {select_field("personnel_category_UUID", "Personnel category", category_options, record?.personnel_category_UUID)}
                        {select_field("supervisor_emp_UUID", "Supervisor", supervisor_options.map((row) => ({ id: row.id, name: `${row.name} (${row.employee_number})` })), record?.supervisor_emp_UUID ?? "", false)}
                        {select_field("record_status", "Record status", [{ id: "Active", name: "Active" }, { id: "Inactive", name: "Inactive" }], record?.record_status || "Active")}
                    </fieldset>
                    {save_error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{save_error}</p>}
                </div>
                <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
                    <Button type="button" variant="secondary" onClick={close} disabled={saving}>Cancel</Button>
                    <Button type="submit" is_loading={saving} disabled={missing_references} className="bg-[#0b2238]! hover:bg-[#193951]!">{record ? "Update personnel" : "Save personnel"}</Button>
                </div>
            </form>
        </FormDialog>
    );
}
