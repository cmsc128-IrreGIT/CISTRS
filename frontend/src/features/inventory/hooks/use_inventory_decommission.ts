
import { useSyncExternalStore } from "react";
import type { InventoryItem } from "../types/inventory_types";

type PartId = InventoryItem["part_UUID"];

const STORAGE_KEY = "decommissioned_inventory_ids";
const CHANGE_EVENT = "decommissioned_inventory_changed";

let cached_raw: string | null | undefined;
let cached_ids: PartId[] = [];
const empty_ids: PartId[] = [];

function get_snapshot(): PartId[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw !== cached_raw) {
        cached_raw = raw;

        try {
            const parsed: unknown = JSON.parse(raw ?? "[]");
            cached_ids = Array.isArray(parsed)
                ? parsed.filter(
                      (id): id is PartId => typeof id === "string"
                  )
                : [];
        } catch {
            cached_ids = [];
        }
    }

    return cached_ids;
}

function subscribe(callback: () => void) {
    window.addEventListener(CHANGE_EVENT, callback);
    window.addEventListener("storage", callback);

    return () => {
        window.removeEventListener(CHANGE_EVENT, callback);
        window.removeEventListener("storage", callback);
    };
}

function get_server_snapshot(): PartId[] {
    return empty_ids;
}

function save_ids(ids: PartId[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

export default function useDecommissionedInventory() {
    const decommissioned_ids = useSyncExternalStore(
        subscribe,
        get_snapshot,
        get_server_snapshot
    );

    function decommission_item(id: PartId) {
        const current_ids = get_snapshot();

        if (!current_ids.includes(id)) {
            save_ids([...current_ids, id]);
        }
    }

    function restore_item(id: PartId) {
        save_ids(
            get_snapshot().filter((stored_id) => stored_id !== id)
        );
    }

    function is_decommissioned(id: PartId) {
        return decommissioned_ids.includes(id);
    }

    return {
        decommissioned_ids,
        decommission_item,
        restore_item,
        is_decommissioned,
    };
}
