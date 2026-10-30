import { useCallback, useEffect, useState } from "react";
import { get_inventory } from "../services/inventory_services";
import type { InventoryItem } from "../types/inventory_types";

export default function useInventory() {
    const [items, set_items] = useState<InventoryItem[]>([]);
    const [is_loading, set_is_loading] = useState(true);
    const [error, set_error] = useState<string | null>(null);

    const load_inventory = useCallback(async () => {
        try {
            set_is_loading(true);
            set_error(null);

            const data = await get_inventory();
            set_items(data);
        } catch (error) {
            set_error(
                error instanceof Error
                    ? error.message
                    : "Failed to load inventory.",
            );
        } finally {
            set_is_loading(false);
        }
    }, []);

    useEffect(() => {
        load_inventory();
    }, [load_inventory]);

    return {
        items,
        is_loading,
        error,
        reload: load_inventory,
    };
}