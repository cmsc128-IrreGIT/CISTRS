import { useCallback, useEffect, useRef, useState } from "react";
import { get_inventory_history } from "../services/inventory_services";
import type { InventoryTransaction } from "../types/inventory_types";

export default function useInventoryHistory() {
    const [history, set_data] = useState<InventoryTransaction[]>([]);
    const [is_loading, set_is_loading] = useState(true);
    const [error, set_error] = useState<string | null>(null);
    const request_id = useRef({ id: 0 });

    const load = useCallback(() => {
        const current_request = ++request_id.current.id;
        return get_inventory_history()
            .then(
                (data) => {
                    if (current_request === request_id.current.id) {
                        set_data(data);
                        set_error(null);
                    }
                },
                (cause: unknown) => {
                    if (current_request === request_id.current.id)
                        set_error(
                            cause instanceof Error
                                ? cause.message
                                : "Failed to load inventory data.",
                        );
                },
            )
            .finally(() => {
                if (current_request === request_id.current.id)
                    set_is_loading(false);
            });
    }, []);

    const reload = useCallback(() => {
        set_is_loading(true);
        set_error(null);
        return load();
    }, [load]);

    useEffect(() => {
        const state = request_id.current;
        void load();
        return () => {
            ++state.id;
        };
    }, [load]);

    return { history, is_loading, error, reload };
}
