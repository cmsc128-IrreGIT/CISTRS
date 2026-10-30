import { useEffect, useState } from "react";
import { get_inventory_history } from "../services/inventory_services";
import type { InventoryTransaction } from "../types/inventory_types";

export default function useInventoryHistory() {
    const [history, set_history] = useState<InventoryTransaction[]>([]);
    const [is_loading, set_is_loading] = useState(true);
    const [error, set_error] = useState<string | null>(null);

    async function load_history() {
        try {
            set_is_loading(true);
            set_error(null);

            const data = await get_inventory_history();
            set_history(data);
        } catch (error) {
            set_error(
                error instanceof Error
                    ? error.message
                    : "Failed to load inventory history.",
            );
        } finally {
            set_is_loading(false);
        }
    }

    useEffect(() => {
        load_history();
    }, []);

    return {
        history,
        is_loading,
        error,
        reload: load_history,
    };
}