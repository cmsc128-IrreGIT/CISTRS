import { useState } from "react";
import type { InventoryItem } from "../types/inventory_types";

import { get_stock_status } from "../utils/stock_status";

export default function useInventoryFilters(
    items: InventoryItem[],
    stock_filter: string,
    set_stock_filter: (value: string) => void,
) {
    const [search, set_search] = useState("");
    const [selected_category, set_category] = useState("");
    const [location, set_location] = useState("");

    const categories = [
        ...new Set(
            items.flatMap((item) => {
                const label = item.category?.trim();
                return label ? [label] : [];
            }),
        ),
    ].sort();
    const category = categories.includes(selected_category)
        ? selected_category
        : "";
    const search_value = search.trim().toLowerCase();
    const filtered_items = items.filter((item) => {
        const matches_search =
            search_value === "" ||
            item.part_name.toLowerCase().includes(search_value) ||
            item.part_number.toLowerCase().includes(search_value);

        const stock_status = get_stock_status(item);
        const matches_stock =
            !stock_filter ||
            (stock_filter === "alerts"
                ? stock_status !== "in_stock"
                : stock_filter === stock_status);
        return (
            matches_search &&
            matches_stock &&
            (!category || item.category?.trim() === category) &&
            (!location ||
                item.locations?.some(
                    (entry) => entry.location_UUID === location,
                ))
        );
    });

    function clear_filters() {
        set_search("");
        set_stock_filter("");
        set_category("");
        set_location("");
    }

    return {
        search,
        set_search,
        stock_filter,
        set_stock_filter,
        filtered_items,
        categories,
        category,
        set_category,
        location,
        set_location,
        is_filtered: Boolean(
            search.trim() || stock_filter || category || location,
        ),
        clear_filters,
    };
}
