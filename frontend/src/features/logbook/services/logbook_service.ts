import { API_BASE_URL, ApiError, api, api_fetch } from "../../../shared/api/client";
import type { LogbookEntry, LogbookFuelInput, LogbookFuelTransaction, LogbookFuelUpdate, LogbookLookups, LogbookSectorInput } from "../types/logbook_types";

type LogbookState = {
    records: LogbookEntry[];
    is_loading: boolean;
    error: string | null;
};

type ExportInput = { aircraft_UUID?: string; from?: string; to?: string; sector_UUIDs?: string[] };

const listeners = new Set<() => void>();
let state: LogbookState = { records: [], is_loading: true, error: null };
let pending_load: Promise<void> | null = null;
let loaded = false;

function notify() {
    listeners.forEach((listener) => listener());
}

function set_state(next: LogbookState) {
    state = next;
    notify();
}

async function list_all_sectors(): Promise<LogbookEntry[]> {
    const records: LogbookEntry[] = [];
    let offset = 0;
    while (true) {
        const query = new URLSearchParams({ order: "desc", limit: "200", offset: String(offset) });
        const page = await api<LogbookEntry[]>(`/logbook/sectors?${query}`);
        records.push(...page);
        if (page.length < 200) return records;
        offset += page.length;
    }
}

async function load(force = false) {
    if (pending_load) return pending_load;
    if (loaded && !force) return;
    set_state({ ...state, is_loading: true, error: null });
    pending_load = list_all_sectors()
        .then((records) => {
            loaded = true;
            set_state({ records, is_loading: false, error: null });
        })
        .catch((cause: unknown) => {
            set_state({
                ...state,
                is_loading: false,
                error: cause instanceof Error ? cause.message : "Could not load logbook entries.",
            });
        })
        .finally(() => { pending_load = null; });
    return pending_load;
}

function replace_record(record: LogbookEntry) {
    const exists = state.records.some((row) => row.sector_UUID === record.sector_UUID);
    set_state({
        ...state,
        records: exists
            ? state.records.map((row) => row.sector_UUID === record.sector_UUID ? record : row)
            : [record, ...state.records],
        error: null,
    });
    loaded = true;
    return record;
}

function json_body(method: "POST" | "PATCH", body: object): RequestInit {
    return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export const logbook_service = {
    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    get_snapshot() { return state; },
    load() { return load(); },
    reload() { return load(true); },
    async get_entry(sector_UUID: string) {
        return api<LogbookEntry>(`/logbook/sectors/${encodeURIComponent(sector_UUID)}`);
    },
    async get_lookups() {
        return api<LogbookLookups>("/lookups");
    },
    async create_entry(values: LogbookSectorInput) {
        return replace_record(await api<LogbookEntry>("/logbook/sectors", json_body("POST", values)));
    },
    async update_entry(sector_UUID: string, values: Partial<LogbookSectorInput>) {
        return replace_record(await api<LogbookEntry>(
            `/logbook/sectors/${encodeURIComponent(sector_UUID)}`,
            json_body("PATCH", values),
        ));
    },
    async add_fuel_transaction(sector_UUID: string, values: LogbookFuelInput) {
        const fuel = await api<LogbookFuelTransaction>(
            `/logbook/sectors/${encodeURIComponent(sector_UUID)}/fuel-transactions`,
            json_body("POST", values),
        );
        const record = await api<LogbookEntry>(`/logbook/sectors/${encodeURIComponent(sector_UUID)}`);
        replace_record(record);
        return fuel;
    },
    async update_fuel_transaction(fuel_UUID: string, values: LogbookFuelUpdate) {
        const fuel = await api<LogbookFuelTransaction>(`/logbook/fuel-transactions/${encodeURIComponent(fuel_UUID)}`, json_body("PATCH", values));
        const record = await api<LogbookEntry>(`/logbook/sectors/${encodeURIComponent(fuel.sector_UUID)}`);
        replace_record(record);
        return fuel;
    },
    async prepare_export(criteria: ExportInput) {
        const response = await api_fetch(`${API_BASE_URL}/logbook/export`, json_body("POST", criteria));
        if (!response.ok) {
            let message = "Could not export logbook records.";
            try {
                const body = await response.json();
                if (typeof body.message === "string") message = body.message;
            } catch { /* Keep the fallback message for non-JSON errors. */ }
            throw new ApiError(response.status, message);
        }
        const filename = /filename="(.+?)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? "logbook.csv";
        return { blob: await response.blob(), filename, total: response.headers.get("X-Total-Count") };
    },
    download_export({ blob, filename }: { blob: Blob; filename: string }) {
        const url = URL.createObjectURL(blob);
        const link = Object.assign(document.createElement("a"), { href: url, download: filename });
        document.body.append(link);
        try {
            link.click();
        } finally {
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    },
    async export_records(criteria: ExportInput) {
        const report = await logbook_service.prepare_export(criteria);
        logbook_service.download_export(report);
        return report.total;
    },
};