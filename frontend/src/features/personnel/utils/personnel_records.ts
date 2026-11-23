import { employee_name } from "../../../shared/utils/employee_name";
import type { PreviewRecord } from "../../../shared/types/record_types";
import { seeded_positions } from "../config/seeded_positions";
import type { PersonnelEmployeeResponse, PersonnelRecord, PersonnelLicense } from "../types/personnel_types";

function normalize_license(license: unknown): PersonnelLicense {
    const l = license as Record<string, unknown>;
    const license_type = l.license_type as { license_type_name?: string } | null | undefined;
    return {
        emp_license_UUID: String(l.emp_license_UUID ?? ""),
        license_number: String(l.license_number ?? ""),
        expiry_date: l.expiry_date ? String(l.expiry_date) : null,
        date_issued: l.date_issued ? String(l.date_issued) : undefined,
        renewal_status_UUID: l.renewal_status_UUID ? String(l.renewal_status_UUID) : null,
        renewal_status: l.renewal_status_name ? { status_name: String(l.renewal_status_name) } : null,
        license_type: l.license_type_name || license_type?.license_type_name ? { license_type_name: String(l.license_type_name || license_type?.license_type_name) } : undefined,
    };
}

export function normalize_personnel(employee: PersonnelEmployeeResponse): PersonnelRecord {
    const contacts = employee.contacts?.flatMap(({ contact }) => contact ? [contact] : []) ?? [];
    const email = contacts.find((contact) => /work.*email/i.test(contact.contact_type)) ??
        contacts.find((contact) => /^email$/i.test(contact.contact_type));
    const position = typeof employee.position === "string" ? employee.position : employee.position?.position_name;
    return {
        id: employee.emp_UUID,
        employee_number: employee.emp_number,
        name: employee_name(employee),
        position: position?.trim() || seeded_positions.get(employee.position_UUID?.toLowerCase() ?? "") || "",
        department: employee.department?.trim() ?? "",
        category: employee.personnel_category ?? "",
        base: employee.base?.base_name ?? "",
        employment_status: employee.employment_status?.status_name ?? employee.record_status ?? "",
        record_status: employee.record_status ?? "",
        email: email?.contact_value ?? "",
        phone: contacts.find((contact) => /phone|mobile|telephone/i.test(contact.contact_type))?.contact_value ?? "",
        licenses: (employee.licenses ?? []).map(normalize_license),
        preview: false,
        employee,
    };
}

export function is_pilot(record: PersonnelRecord) {
    return /\bpilot\b/i.test(record.position) || /^(captain|first officer)$/i.test(record.position) || /^pilot$/i.test(record.category);
}

export function personnel_options(
    records: PersonnelRecord[],
    field: "position" | "department" | "employment_status",
    defaults: string[] = [],
) {
    const unique = new Map<string, string>();
    for (const value of [...records.map((record) => record[field]), ...defaults]) {
        if (!value.trim()) continue;
        const key = value.trim().toLowerCase();
        if (!unique.has(key)) unique.set(key, value);
    }
    return [...unique.values()].sort((a, b) => a.localeCompare(b));
}

export function latest_availability(rows: PreviewRecord[]) {
    const latest = new Map<string, PreviewRecord>();
    for (const row of rows) {
        const current = latest.get(row.personnel);
        if (!current || row.date > current.date) latest.set(row.personnel, row);
    }
    return latest;
}

const date_format = new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

export function personnel_date(value?: string | null) {
    const date = new Date(`${value?.slice(0, 10) ?? ""}T00:00:00Z`);
    return Number.isFinite(date.getTime()) ? date_format.format(date) : "Not recorded";
}
