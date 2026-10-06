import { useSyncExternalStore } from "react";
import { notifications_store } from "../data/notifications_store";
export default function useNotifications() {
    return useSyncExternalStore(notifications_store.subscribe, notifications_store.get_snapshot);
}
