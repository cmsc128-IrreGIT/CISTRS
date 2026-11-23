import { api, availabilityApi, documentsApi, licensesApi } from "../../../shared/api/client";
import type { PersonnelEmployeeResponse, PersonnelInput, PersonnelLookups } from "../types/personnel_types";
import { normalize_personnel } from "../utils/personnel_records";

export function get_personnel_lookups() {
    return api<PersonnelLookups>("/lookups");
}

export async function create_personnel(values: PersonnelInput) {
    return normalize_personnel(await api<PersonnelEmployeeResponse>("/personnel/employees", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
    }));
}

export async function update_personnel(id: string, values: Partial<PersonnelInput>) {
    return normalize_personnel(await api<PersonnelEmployeeResponse>(`/personnel/employees/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
    }));
}

// Retrieve the signed-in employee without loading the full personnel directory.
// The backend still enforces the Personnel feature on this endpoint.
export async function get_personnel(emp_UUID: string, signal?: AbortSignal) {
    const employee = await api<PersonnelEmployeeResponse>(
        `/personnel/employees/${encodeURIComponent(emp_UUID)}`,
        { signal },
    );
    return normalize_personnel(employee);
}

export async function list_staff_directory(signal?: AbortSignal) {
    const employees = await api<PersonnelEmployeeResponse[]>("/personnel/directory", { signal });
    return employees.map(normalize_personnel);
}

export async function list_personnel(signal?: AbortSignal) {
    const employees = await api<PersonnelEmployeeResponse[]>("/personnel/employees", { signal });
    return employees.map(normalize_personnel);
}

// Availability API wrappers
export const availability_service = {
    list: (params?: { emp_UUID?: string; from?: string; to?: string; limit?: number; offset?: number }) =>
        availabilityApi.list(params),

    get: (availability_UUID: string) => availabilityApi.get(availability_UUID),

    save: (values: {
        emp_UUID: string;
        date: string;
        status: "Available" | "Unavailable";
        notes?: string | null;
    }) => availabilityApi.create(values),

    update: (availability_UUID: string, data: {
        status?: "Available" | "Unavailable";
        notes?: string | null;
    }) => availabilityApi.update(availability_UUID, data),

    delete: (availability_UUID: string) => availabilityApi.delete(availability_UUID),
};

// Documents API wrappers
export const documents_service = {
    list: (params?: {
        emp_UUID?: string;
        kind?: "License" | "Training" | "Medical" | "Company ID" | "Other";
        from?: string;
        to?: string;
        limit?: number;
        offset?: number;
    }) => documentsApi.list(params),

    get: (document_UUID: string) => documentsApi.get(document_UUID),

    create: (data: {
        emp_UUID: string;
        kind: "License" | "Training" | "Medical" | "Company ID" | "Other";
        name: string;
        reference?: string | null;
        date_issued: string;
        expiry_date?: string | null;
        renewal_date?: string | null;
        file_path?: string | null;
        remarks?: string | null;
    }) => documentsApi.create(data),

    update: (document_UUID: string, data: {
        kind?: "License" | "Training" | "Medical" | "Company ID" | "Other";
        name?: string;
        reference?: string | null;
        date_issued?: string;
        expiry_date?: string | null;
        renewal_date?: string | null;
        file_path?: string | null;
        remarks?: string | null;
    }) => documentsApi.update(document_UUID, data),

    delete: (document_UUID: string) => documentsApi.delete(document_UUID),
};

// Licenses API wrappers
export const licenses_service = {
    list: (emp_UUID: string) => licensesApi.list(emp_UUID),

    get: (emp_license_UUID: string) => licensesApi.get(emp_license_UUID),

    create: (emp_UUID: string, data: {
        license_type_UUID: string;
        renewal_status_UUID: string;
        license_number: string;
        issuing_authority: string;
        date_issued: string;
        expiry_date?: string | null;
        remarks?: string | null;
    }) => licensesApi.create(emp_UUID, data),

    update: (emp_license_UUID: string, data: {
        license_type_UUID?: string;
        renewal_status_UUID?: string;
        license_number?: string;
        issuing_authority?: string;
        date_issued?: string;
        expiry_date?: string | null;
        remarks?: string | null;
    }) => licensesApi.update(emp_license_UUID, data),

    delete: (emp_license_UUID: string) => licensesApi.delete(emp_license_UUID),
};
