import { useSyncExternalStore } from "react";
import { aircraft_service } from "../services/aircraft_service";

export default function useAircraft() {
    return useSyncExternalStore(
        aircraft_service.subscribe,
        aircraft_service.list,
    );
}

export function useAircraftStatusHistory() {
    return useSyncExternalStore(
        aircraft_service.subscribe_to_status_history,
        aircraft_service.list_status_history,
    );
}
