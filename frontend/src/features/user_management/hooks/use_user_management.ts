import { useSyncExternalStore } from "react";
import { user_management_store } from "../data/user_management_store";
export default function useUserManagement() {
    return useSyncExternalStore(
        user_management_store.subscribe,
        user_management_store.get_snapshot,
    );
}
