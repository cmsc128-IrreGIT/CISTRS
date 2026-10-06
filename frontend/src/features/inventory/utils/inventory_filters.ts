import { inventory_search_fields } from "../config/inventory_fields";
import type { InventoryItem } from "../types/inventory_types";

export function get_aircraft_options(items: InventoryItem[]) {
    return Array.from(
        new Set(
            items
                .map((item) => item.aircraft)
                .filter((aircraft): aircraft is string => aircraft !== null),
        ),
    ).sort((first, second) => first.localeCompare(second));
}

export function filter_inventory(
    items: InventoryItem[],
    search: string,
    aircraft_filter: string,
) {
    const search_term = search.trim().toLowerCase();

    return items.filter((item) => {
        const matches_search = inventory_search_fields.some((field) =>
            item[field].toLowerCase().includes(search_term),
        );

        const matches_aircraft = aircraft_filter === "" ||
            (aircraft_filter === "unassigned"
                ? item.aircraft === null
                : item.aircraft === aircraft_filter);

        return matches_search && matches_aircraft;
    });
}