import { useSyncExternalStore } from "react";
import { aircraft_store } from "../data/aircraft_store";
export default function useAircraft() {
    return useSyncExternalStore(
        aircraft_store.subscribe,
        aircraft_store.get_snapshot,
    );
}
