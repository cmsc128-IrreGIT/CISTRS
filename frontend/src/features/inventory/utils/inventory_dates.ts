import { INVENTORY_DATE_OPTIONS } from "../constants/inventory_constants";
import type { InventoryItem } from "../types/inventory_types";

const date_format = new Intl.DateTimeFormat("en-GB", {
    ...INVENTORY_DATE_OPTIONS,
    timeZone: "UTC",
});

export function format_inventory_expiry({ expiry_date }: Pick<InventoryItem, "expiry_date">) {
    if (expiry_date === null) return "Not applicable";
    const date = Date.parse(expiry_date ?? "");
    return Number.isNaN(date) ? "Not recorded" : date_format.format(date);
}
