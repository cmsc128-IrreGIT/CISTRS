import { notification_inbox } from "../data/notifications_store";
import type { NotificationService } from "../types/notification_types";

// The preview inbox is scoped to the signed-in account.
export function notification_service(account_id: string): NotificationService {
    const inbox = notification_inbox(account_id);
    return {
        async list() {
            return inbox.get_snapshot().map((record) => ({ ...record }));
        },
        async set_read(id, is_read) {
            inbox.set_read(id, is_read);
        },
        async mark_all_read() {
            inbox.mark_all_read();
        },
    };
}
