import { useSyncExternalStore } from "react";
import { notification_inbox } from "../data/notifications_store";

export default function useNotifications(account_id: string) {
    const inbox = notification_inbox(account_id);
    return useSyncExternalStore(inbox.subscribe, inbox.get_snapshot);
}
