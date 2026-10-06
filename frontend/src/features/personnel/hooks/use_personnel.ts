import { useSyncExternalStore } from "react";
import { personnel_store } from "../data/personnel_store";
export default function usePersonnel() {
    return useSyncExternalStore(personnel_store.subscribe, personnel_store.get_snapshot);
}
