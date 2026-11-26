import { get_inventory_history } from "../services/inventory_services";
import useInventoryQuery from "./use_inventory_query";

export default function useInventoryHistory(enabled = true, part_id?: string) {
    const fetch_history = useCallback(
        () => get_inventory_history(part_id),
        [part_id],
    );
    const {
        rows: history,
        is_loading,
        error,
        reload,
    } = useInventoryQuery(fetch_history, enabled);
    return { history, is_loading, error, reload };
}
import { useCallback } from "react";
