import { useSyncExternalStore } from "react";
import { maintenance_store } from "../data/maintenance_store";
export default function useMaintenance() {
    return useSyncExternalStore(
        maintenance_store.subscribe,
        maintenance_store.get_snapshot,
    );
}
