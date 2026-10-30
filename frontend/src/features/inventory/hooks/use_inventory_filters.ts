import { useState } from "react";
import type { InventoryItem } from "../types/inventory_types";

export default function useInventoryFilters(
    items: InventoryItem[],
) {
    const [search, set_search] = useState("");
    const [stock_filter, set_stock_filter] = useState("");

    const filtered_items = items.filter((item) => {
        const search_value = search.trim().toLowerCase();

        const matches_search =
            search_value === "" ||
            item.part_name.toLowerCase().includes(search_value) ||
            item.part_number.toLowerCase().includes(search_value);

        const matches_stock =
            stock_filter === "" ||
            (stock_filter === "in_stock"
                ? item.total_quantity > 0
                : item.total_quantity === 0);

        return matches_search && matches_stock;
    });

    function clear_filters() {
        set_search("");
        set_stock_filter("");
    }

    return {
        search,
        set_search,
        stock_filter,
        set_stock_filter,
        filtered_items,
        is_filtered:
            search.trim() !== "" || stock_filter !== "",
        clear_filters,
    };
}