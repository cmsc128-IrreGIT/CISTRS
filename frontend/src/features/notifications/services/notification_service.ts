import { notifications_store } from "../data/notifications_store";
import type { NotificationService } from "../types/notification_types";

// Preview adapter. Replace these methods with authenticated API requests.
// The frontend never contacts an SMS/email provider directly.
export const notification_service: NotificationService = {
    async list() {
        return notifications_store
            .get_snapshot()
            .map((record) => ({ ...record }));
    },
    async set_read(id, is_read) {
        notifications_store.set_read(id, is_read);
    },
    async mark_all_read() {
        notifications_store.mark_all_read();
    },
};
