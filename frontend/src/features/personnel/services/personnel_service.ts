import { api } from "../../../shared/api/client";
import type { PersonnelEmployeeResponse } from "../types/personnel_types";
import { normalize_personnel } from "../utils/personnel_records";

export async function list_personnel(signal?: AbortSignal) {
    const employees = await api<PersonnelEmployeeResponse[]>("/personnel/employees", { signal });
    return employees.map(normalize_personnel);
}
