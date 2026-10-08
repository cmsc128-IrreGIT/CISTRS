import { empty_logbook_values } from "../config/logbook_config";
import type { LogbookEntry, LogbookFormValues } from "../types/logbook_types";

let records: LogbookEntry[] = [
    {
        ...empty_logbook_values(),
        id: "logbook-demo-1",
        aircraft: "Demo Aircraft A",
        entry_date: "2026-10-06",
        log_page: "DEMO-001",
        station_from: "Demo Station A",
        station_to: "Demo Station B",
        commander_name: "Demo Pilot",
        defects:
            "Fictional entry. Awaiting client confirmation of the technical-logbook workflow.",
        action_taken: "No actual maintenance action recorded in this preview.",
    },
];
const listeners = new Set<() => void>();
export const logbook_store = {
    get_snapshot: () => records,
    subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
    save: (values: LogbookFormValues, id?: string) => {
        if (id && !records.some((record) => record.id === id))
            throw new Error("Logbook entry not found.");
        const record: LogbookEntry = {
            ...values,
            id: id ?? crypto.randomUUID(),
        };
        records = id
            ? records.map((previous) =>
                  previous.id === id ? record : previous,
              )
            : [...records, record];
        listeners.forEach((listener) => listener());
        return record;
    },
};
