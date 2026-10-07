import { useState } from "react";
import type { InventoryItem } from "../types/inventory_types";
import {
    filter_inventory,
    get_aircraft_options,
} from "../utils/inventory_filters";

export default function useInventoryFilters(items: InventoryItem[]) {
    const [search, set_search] = useState("");
    const [aircraft_filter, set_aircraft_filter] = useState("");

    function clear_filters() {
        set_search("");
        set_aircraft_filter("");
    }

    return {
        search,
        set_search,
        aircraft_filter,
        set_aircraft_filter,
        aircraft_options: get_aircraft_options(items),
        filtered_items: filter_inventory(items, search, aircraft_filter),
        is_filtered: search.trim() !== "" || aircraft_filter !== "",
        clear_filters,
    };
}
