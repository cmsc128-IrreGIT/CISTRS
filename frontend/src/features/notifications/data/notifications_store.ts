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

const preview_inboxes = new Map<
    string,
    ReturnType<typeof create_notifications_store>
>();

export function notification_inbox(account_id: string) {
    const existing = preview_inboxes.get(account_id);
    if (existing) return existing;

    const now = Date.now();
    const store = create_notifications_store([
        {
            id: "alert-demo-1",
            title: "Stock review: Brake Pad Set",
            message: "Review the current quantity and minimum stock level.",
            category: "inventory",
            to: "/inventory",
            record_id: "BRK-001",
            read_at: null,
            created_at: new Date(now).toISOString(),
        },
        {
            id: "alert-demo-2",
            title: "Maintenance reminder",
            message: "RP-C1738 · Review the routine inspection.",
            category: "maintenance",
            to: "/maintenance?status=pending",
            record_id: "maintenance-demo-1",
            read_at: null,
            created_at: new Date(now - 60_000).toISOString(),
        },
        {
            id: "alert-demo-3",
            title: "License expiry reminder",
            message: "Review the personnel license record.",
            category: "personnel",
            to: "/personnel",
            record_id: "SA-0004",
            read_at: null,
            created_at: new Date(now - 120_000).toISOString(),
        },
        {
            id: "alert-demo-4",
            title: "Stock adjustment",
            message: "Brake Pad Set · Review the recorded quantity change.",
            category: "inventory",
            to: "/inventory/history",
            record_id: "b72e4d13-8a56-4c21-a735-6e9b02d4f817",
            read_at: new Date(now - 180_000).toISOString(),
            created_at: new Date(now - 180_000).toISOString(),
        },
    ]);
    preview_inboxes.set(account_id, store);
    return store;
}
