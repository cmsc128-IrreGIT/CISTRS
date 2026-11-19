import { api } from "../../../shared/api/client";
import type { PersonnelEmployeeInput, PersonnelEmployeeResponse } from "../types/personnel_types";
import { normalize_personnel } from "../utils/personnel_records";

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

function json_body(method: "POST" | "PATCH", values: object): RequestInit {
    return {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
    };
}

export async function create_personnel(values: PersonnelEmployeeInput) {
    const employee = await api<PersonnelEmployeeResponse>("/personnel/employees", json_body("POST", values));
    return normalize_personnel(employee);
}

export async function update_personnel(emp_UUID: string, values: Partial<PersonnelEmployeeInput>) {
    const employee = await api<PersonnelEmployeeResponse>(
        `/personnel/employees/${encodeURIComponent(emp_UUID)}`,
        json_body("PATCH", values),
    );
    return normalize_personnel(employee);
}
