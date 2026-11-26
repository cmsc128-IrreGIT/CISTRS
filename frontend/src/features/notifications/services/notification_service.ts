import {
    notificationsApi,
    type NotificationItem,
} from "../../../shared/api/client";
import type {
    NotificationCategory,
    NotificationService,
} from "../types/notification_types";

const category_names: Record<NotificationCategory, string> = {
    inventory: "Inventory",
    maintenance: "Maintenance",
    aircraft: "Aircraft",
    personnel: "Personnel",
    system: "System",
};

// Map backend notification item to frontend NotificationRecord
function mapNotification(item: NotificationItem) {
    return {
        id: item.recipient_UUID,
        title: item.title,
        message: item.message,
        category: item.category.toLowerCase() as
            "inventory" | "maintenance" | "aircraft" | "personnel" | "system",
        to:
            item.category === "System"
                ? ["FLT_QA_PENDING", "FUEL_DISCREPANCY"].includes(
                      item.event_code,
                  )
                    ? "/logbook"
                    : null
                : `/${item.category.toLowerCase()}`,
        record_id: undefined,
        created_at: item.created_at,
        read_at: item.read_at,
        severity: item.severity,
        event_code: item.event_code,
        notification_UUID: item.notification_UUID,
    };
}

export function notification_service(): NotificationService {
    return {
        async list() {
            const records = [];
            let page = 1;
            while (true) {
                const response = await notificationsApi.list({
                    limit: 100,
                    page,
                });
                records.push(...response.items.map(mapNotification));
                if (!response.items.length || records.length >= response.total)
                    return records;
                page++;
            }
        },

        async set_read(id: string, is_read: boolean) {
            if (is_read) {
                await notificationsApi.markRead(id);
            } else {
                // Backend doesn't have "mark unread" - would need to be implemented
                // For now, we'll throw an error if trying to mark as unread
                throw new Error(
                    "Marking notifications as unread is not supported yet.",
                );
            }
        },

        async mark_all_read(category) {
            await notificationsApi.markAllRead(
                category ? category_names[category] : undefined,
            );
        },
    };
}
