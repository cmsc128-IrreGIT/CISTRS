import { useEffect, useSyncExternalStore } from "react";
import { logbook_service } from "../services/logbook_service";

export function useLogbookData() {
    const state = useSyncExternalStore(
        logbook_service.subscribe,
        logbook_service.get_snapshot,
        logbook_service.get_snapshot,
    );
    useEffect(() => { void logbook_service.load(); }, []);
    return { ...state, reload: logbook_service.reload };
}

export default function useLogbook() {
    return useLogbookData().records;
}
