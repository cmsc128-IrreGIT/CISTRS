import { useSyncExternalStore } from "react";
import { logbook_store } from "../data/logbook_store";
export default function useLogbook() {
    return useSyncExternalStore(
        logbook_store.subscribe,
        logbook_store.get_snapshot,
    );
}
