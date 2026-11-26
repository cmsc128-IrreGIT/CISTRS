import { api } from "../../../shared/api/client";
import type {
    AircraftCreateInput,
    AircraftRecord,
    AircraftResponse,
    AircraftStatus,
    AircraftStatusInput,
    AircraftType,
} from "../types/aircraft_types";

type AircraftLookups = {
    aircraft_statuses: AircraftStatus[];
    aircraft_types: AircraftType[];
};
type AircraftState = {
    aircraft: AircraftRecord[];
    statuses: AircraftStatus[];
    types: AircraftType[];
    loading: boolean;
    error: string;
};
const listeners = new Set<() => void>();
let state: AircraftState = {
    aircraft: [],
    statuses: [],
    types: [],
    loading: true,
    error: "",
};
let pending: Promise<void> | null = null;
let loaded = false;
const empty_history: import("../../../shared/types/record_types").PreviewRecord[] =
    [];

function normalize_aircraft(row: AircraftResponse): AircraftRecord {
    return {
        id: row.aircraft_UUID,
        aircraft_UUID: row.aircraft_UUID,
        registration: row.registration,
        model: row.aircraft_type.type_name,
        current_aircraft_hours: String(row.current_hours),
        status: row.status.status_name,
        aircraft_status_UUID: row.status.aircraft_status_UUID,
        status_description: row.status.description,
        hours_updated_at: row.hours_updated_at ?? "",
    };
}
function publish(next: AircraftState) {
    state = next;
    listeners.forEach((listener) => listener());
}
function replace_aircraft(row: AircraftResponse) {
    const record = normalize_aircraft(row);
    publish({
        ...state,
        aircraft: [
            ...state.aircraft.filter((other) => other.id !== record.id),
            record,
        ].sort((a, b) => a.registration.localeCompare(b.registration)),
    });
    return record;
}
async function load(force = false) {
    if (pending) return pending;
    if (loaded && !force) return;
    publish({ ...state, loading: true, error: "" });
    pending = Promise.all([
        api<AircraftResponse[]>("/lookups/aircraft"),
        api<AircraftLookups>("/lookups"),
    ])
        .then(([rows, lookups]) => {
            loaded = true;
            publish({
                aircraft: rows.map(normalize_aircraft),
                statuses: lookups.aircraft_statuses,
                types: lookups.aircraft_types ?? [],
                loading: false,
                error: "",
            });
        })
        .catch((cause: unknown) =>
            publish({
                ...state,
                loading: false,
                error:
                    cause instanceof Error
                        ? cause.message
                        : "Could not load aircraft.",
            }),
        )
        .finally(() => {
            pending = null;
        });
    return pending;
}
export const aircraft_service = {
    list: () => state.aircraft,
    get_snapshot: () => state,
    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
    load: () => load(),
    reload: () => load(true),
    async create(values: AircraftCreateInput) {
        const row = await api<AircraftResponse>("/admin/aircraft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
        });
        if (pending) await pending;
        return replace_aircraft(row);
    },
    async get_aircraft(id: string, signal?: AbortSignal) {
        const row = await api<AircraftResponse>(
            `/aircraft/${encodeURIComponent(id)}/status`,
            { signal },
        );
        if (!signal?.aborted) return replace_aircraft(row);
        return normalize_aircraft(row);
    },
    async update_status(id: string, values: AircraftStatusInput) {
        return replace_aircraft(
            await api<AircraftResponse>(
                `/aircraft/${encodeURIComponent(id)}/status`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                },
            ),
        );
    },
    // Status history has no backend endpoint. Retain these compatibility exports
    // for the commented-out history section without exposing preview records.
    list_status_history: () => empty_history,
    subscribe_to_status_history: () => () => {},
};
