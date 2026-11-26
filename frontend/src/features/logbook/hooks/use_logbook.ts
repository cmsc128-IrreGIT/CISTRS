import { useEffect, useSyncExternalStore } from "react";
import { logbook_service } from "../services/logbook_service";

export function useLogbookData(enabled = true) {
    const state = useSyncExternalStore(
        logbook_service.subscribe,
        logbook_service.get_snapshot,
        logbook_service.get_snapshot,
    );
    useEffect(() => {
        if (enabled) void logbook_service.load();
    }, [enabled]);
    return { ...state, reload: logbook_service.reload };
}

export default function useLogbook() {
    return useLogbookData().records;
}
