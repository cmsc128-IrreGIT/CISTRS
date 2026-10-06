import { useSyncExternalStore } from "react";
import {
    get_inventory_snapshot,
    subscribe_inventory,
} from "../data/inventory_store";

export default function useInventory() {
    return useSyncExternalStore(subscribe_inventory, get_inventory_snapshot);
}
