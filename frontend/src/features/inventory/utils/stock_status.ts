import type { STOCK_STATUS_LABELS } from "../constants/inventory_constants";
import type { InventoryItem } from "../types/inventory_types";

export function get_stock_status(
    item: InventoryItem,
): keyof typeof STOCK_STATUS_LABELS {
    if (item.total_quantity <= 0) return "out_of_stock";
    return item.is_low_stock ? "low_stock" : "in_stock";
}
