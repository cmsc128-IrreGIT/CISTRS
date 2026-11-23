import { useEffect, useSyncExternalStore } from "react";
import { aircraft_service } from "../services/aircraft_service";

export default function useAircraft() {
    return useAircraftData().aircraft;
}

export function useAircraftData() {
    const state = useSyncExternalStore(aircraft_service.subscribe, aircraft_service.get_snapshot, aircraft_service.get_snapshot);
    useEffect(() => { void aircraft_service.load(); }, []);
    return { ...state, reload: aircraft_service.reload };
}

export function useAircraftStatusHistory() {
    return useSyncExternalStore(aircraft_service.subscribe_to_status_history, aircraft_service.list_status_history);
}
