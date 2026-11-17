import { useSyncExternalStore } from "react";
import { logbook_service } from "../services/logbook_service";
export default function useLogbook() {
    return useSyncExternalStore(
        logbook_service.subscribe,
        logbook_service.list,
    );
}
