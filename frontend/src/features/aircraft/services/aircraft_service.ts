import { api } from "../../../shared/api/client";
import type {
    AircraftRecord,
    AircraftStatusOption,
    UpdateAircraftStatusInput,
} from "../types/aircraft_types";

type AircraftState = {
    aircraft: AircraftRecord[];
    is_loading: boolean;
    error: string | null;
};

const listeners = new Set<() => void>();
let state: AircraftState = {
    aircraft: [],
    is_loading: true,
    error: null,
};
let pending_load: Promise<void> | null = null;
let loaded = false;

function notify() {
    listeners.forEach((listener) => listener());
}

function set_state(next: AircraftState) {
    state = next;
    notify();
}

async function load(force = false): Promise<void> {
    if (pending_load) return pending_load;
    if (loaded && !force) return;

    set_state({ ...state, is_loading: true, error: null });
    pending_load = api<AircraftRecord[]>("/aircraft")
        .then((aircraft) => {
            loaded = true;
            set_state({ aircraft, is_loading: false, error: null });
        })
        .catch((cause: unknown) => {
            set_state({
                ...state,
                is_loading: false,
                error:
                    cause instanceof Error
                        ? cause.message
                        : "Failed to load aircraft records.",
            });
        })
        .finally(() => {
            pending_load = null;
        });
    return pending_load;
}

export const aircraft_service = {
    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    get_snapshot() {
        return state;
    },
    load() {
        return load();
    },
    reload() {
        return load(true);
    },
    list_statuses() {
        return api<AircraftStatusOption[]>("/aircraft/statuses");
    },
    async update_status(
        aircraft_UUID: string,
        values: UpdateAircraftStatusInput,
    ) {
        const updated = await api<AircraftRecord>(
            `/aircraft/${encodeURIComponent(aircraft_UUID)}/status`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            },
        );
        set_state({
            ...state,
            aircraft: state.aircraft
                .map((row) =>
                    row.aircraft_UUID === updated.aircraft_UUID ? updated : row,
                )
                .sort((first, second) =>
                    first.registration.localeCompare(second.registration),
                ),
            error: null,
        });
        loaded = true;
        return updated;
    },
};
