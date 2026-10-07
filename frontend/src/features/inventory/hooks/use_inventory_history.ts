import { useSyncExternalStore } from "react";
import {
    get_inventory_history_snapshot,
    subscribe_inventory,
} from "../data/inventory_store";

export default function useInventoryHistory() {
    return useSyncExternalStore(
        subscribe_inventory,
        get_inventory_history_snapshot,
    );
}
