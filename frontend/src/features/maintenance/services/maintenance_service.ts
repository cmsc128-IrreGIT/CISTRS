import type { PreviewRecord } from "../../../shared/types/record_types";
import { maintenance_store } from "../data/maintenance_store";
import { api, api_fetch, API_BASE_URL, ApiError } from "../../../shared/api/client";
import type { AircraftMaintenance, MaintenanceAdRecord, MaintenanceCpcpTask, MaintenanceKind, MaintenanceRecord } from "../types/maintenance_types";

async function list_all<T>(path: string) {
    const records: T[] = [];
    while (true) {
        const page = await api<T[]>(`${path}?limit=200&offset=${records.length}`);
        records.push(...page);
        if (page.length < 200) return records;
    }
}

// Tasks and work records share a preview list while their API contracts are pending.
export const maintenance_service = {
    list_ad_records: () => list_all<MaintenanceAdRecord>("/maintenance/ad-records"),
    list_cpcp_tasks: () => list_all<MaintenanceCpcpTask>("/maintenance/cpcp-tasks"),
    get_aircraft_maintenance: (id: string) => api<AircraftMaintenance>(`/maintenance/aircraft/${encodeURIComponent(id)}`),
    async save_record(kind: MaintenanceKind, values: Record<string, string | number | null>, id?: string) {
        const path = kind === "ad" ? "ad-records" : "cpcp-tasks";
        const response = await api_fetch(`${API_BASE_URL}/maintenance/${path}${id ? "/" + encodeURIComponent(id) : ""}`, {
            method: id ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
        });
        if (!response.ok) {
            let message = "Could not save maintenance.";
            try {
                const body = await response.json();
                const details = Array.isArray(body.details) ? body.details.map((issue: { field?: string; message?: string }) => [issue.field, issue.message].filter(Boolean).join(": ")).join("; ") : "";
                message = [body.message || message, details].filter(Boolean).join(": ");
            } catch { /* Keep a readable fallback for non-JSON errors. */ }
            throw new ApiError(response.status, message);
        }
        return response.json() as Promise<MaintenanceRecord>;
    },
    list: maintenance_store.get_snapshot,
    subscribe: maintenance_store.subscribe,
    save_task: maintenance_store.save,

    add_work_record(values: Omit<PreviewRecord, "id">, recorded_by = "") {
        return maintenance_store.save({ ...values, recorded_by });
    },
};
