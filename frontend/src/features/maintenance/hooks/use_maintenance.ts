import { useSyncExternalStore } from "react";
import { maintenance_service } from "../services/maintenance_service";
export default function useMaintenance() {
    return useSyncExternalStore(
        maintenance_service.subscribe,
        maintenance_service.list,
    );
}
