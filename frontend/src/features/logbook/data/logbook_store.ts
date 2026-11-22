import { empty_logbook_values } from "../config/logbook_config";
import type { LogbookEntry, LogbookFormValues } from "../types/logbook_types";

let records: LogbookEntry[] = [
    {
        ...empty_logbook_values(),
        id: "logbook-demo-1",
        aircraft: "RP-C8333",
        entry_date: "2026-10-26",
        entry_time: "08:30",
        log_page: "DEMO-LG-01",
        commander_name: "Demo Pilot",
        recorded_by: "Demo Pilot",
        defects: "No defect reported.",
    },
    {
        ...empty_logbook_values(),
        id: "logbook-demo-2",
        aircraft: "RP-C1738",
        entry_date: "2026-10-25",
        entry_time: "15:20",
        log_page: "DEMO-LG-02",
        airframe_total_to_date: "1250.0",
        commander_name: "Demo Pilot",
        recorded_by: "Demo Pilot",
        updated_at: "2026-10-25T15:24:00Z",
        defects: "Unusual indication observed during the recorded check.",
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
    save: (values: LogbookFormValues, id?: string, recorded_by?: string) => {
        const previous = id ? records.find((record) => record.id === id) : undefined;
        if (id && !previous)
            throw new Error("Logbook entry not found.");
        const record: LogbookEntry = {
            ...values,
            aircraft: previous?.aircraft ?? values.aircraft,
            id: id ?? crypto.randomUUID(),
            recorded_by: previous ? previous.recorded_by : recorded_by,
            updated_at: new Date().toISOString(),
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
