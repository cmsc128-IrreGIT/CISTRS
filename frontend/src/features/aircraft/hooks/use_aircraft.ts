import { useSyncExternalStore } from "react";
import { aircraft_status_history, aircraft_store } from "../data/aircraft_store";

export default function useAircraft() {
    return useSyncExternalStore(aircraft_store.subscribe, aircraft_store.get_snapshot);
}

export function useAircraftStatusHistory() {
    return useSyncExternalStore(aircraft_status_history.subscribe, aircraft_status_history.get_snapshot);
}
