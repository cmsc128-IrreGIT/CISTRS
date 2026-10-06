import type { PreviewRecord } from "../types/record_types";

export function create_preview_store(initial: PreviewRecord[]) {
    let records = initial.map((record) => ({ ...record }));
    const listeners = new Set<() => void>();
    return {
        get_snapshot: () => records,
        subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        save: (values: Omit<PreviewRecord, "id">, id?: string) => {
            if (id && !records.some((record) => record.id === id)) {
                throw new Error("Record not found.");
            }
            const record: PreviewRecord = { ...values, id: id ?? crypto.randomUUID() };
            records = id
                ? records.map((previous) => previous.id === id ? record : previous)
                : [...records, record];
            listeners.forEach((listener) => listener());
            return record;
        },
    };
}
