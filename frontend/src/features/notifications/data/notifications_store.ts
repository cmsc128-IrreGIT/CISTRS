import type { NotificationRecord } from "../types/notification_types";

export function create_notifications_store(
    initial_records: NotificationRecord[],
) {
    let records = initial_records.map((record) => ({ ...record }));
    const listeners = new Set<() => void>();
    function publish(next: NotificationRecord[]) {
        records = next;
        listeners.forEach((listener) => listener());
    }
    return {
        get_snapshot: () => records,
        subscribe(listener: () => void) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        set_read(id: string, is_read: boolean) {
            const existing = records.find((record) => record.id === id);
            if (!existing) throw new Error("Notification not found.");
            const read_at = is_read
                ? (existing.read_at ?? new Date().toISOString())
                : null;
            if (read_at === existing.read_at) return;
            publish(
                records.map((record) =>
                    record.id === id ? { ...record, read_at } : record,
                ),
            );
        },
        mark_all_read() {
            if (records.every((record) => record.read_at !== null)) return;
            const read_at = new Date().toISOString();
            publish(
                records.map((record) =>
                    record.read_at === null ? { ...record, read_at } : record,
                ),
            );
        },
    };
}

export const notifications_store = create_notifications_store([
    {
        id: "alert-demo-1",
        title: "Sample stock alert",
        message: "Sample Seal has zero quantity in the initial preview.",
        category: "inventory",
        to: "/inventory/sample-002",
        read_at: null,
        created_at: "2026-10-06T08:00:00Z",
    },
    {
        id: "alert-demo-2",
        title: "Sample maintenance reminder",
        message: "Review the fictional inspection record.",
        category: "maintenance",
        to: "/maintenance",
        read_at: null,
        created_at: "2026-10-06T09:00:00Z",
    },
]);
