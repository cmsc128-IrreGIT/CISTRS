import {
    notificationsApi,
    type NotificationItem,
} from "../../../shared/api/client";
import type { NotificationService } from "../types/notification_types";

// Map backend notification item to frontend NotificationRecord
function mapNotification(item: NotificationItem) {
    return {
        id: item.recipient_UUID,
        title: item.title,
        message: item.message,
        category: item.category.toLowerCase() as
            "inventory" | "maintenance" | "aircraft" | "personnel" | "system",
        to: null, // Could be derived from event_code/category if needed
        record_id: undefined,
        created_at: item.created_at,
        read_at: item.read_at,
    };
}

export function notification_service(): NotificationService {
    return {
        async list() {
            const response = await notificationsApi.list({ limit: 100 });
            return response.items.map(mapNotification);
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

        async mark_all_read() {
            await notificationsApi.markAllRead();
        },
    };
}
