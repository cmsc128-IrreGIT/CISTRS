import { inventory_preview } from "./inventory_preview";
import type {
    InventoryChange,
    InventoryFormValues,
    InventoryItem,
} from "../types/inventory_types";

let items: InventoryItem[] = inventory_preview.map((item) => ({ ...item }));
let history: InventoryChange[] = [];
const listeners = new Set<() => void>();

const tracked_fields = [
    "name",
    "part_number",
    "category",
    "quantity",
    "unit",
    "aircraft",
] as const;

export function get_inventory_snapshot() {
    return items;
}

export function get_inventory_history_snapshot() {
    return history;
}

export function subscribe_inventory(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function save_inventory_item(
    values: InventoryFormValues,
    item_id?: string,
) {
    const previous = item_id
        ? items.find((item) => item.id === item_id)
        : undefined;

    if (item_id && !previous) {
        throw new Error("Inventory item was not found.");
    }

    if (
        previous &&
        tracked_fields.every((field) => previous[field] === values[field])
    ) {
        return previous;
    }

    const saved_item: InventoryItem = {
        ...values,
        id: item_id ?? crypto.randomUUID(),
    };

    items = item_id
        ? items.map((item) => (item.id === item_id ? saved_item : item))
        : [...items, saved_item];

    history = [
        {
            id: crypto.randomUUID(),
            item_id: saved_item.id,
            recorded_at: new Date().toISOString(),
            action: previous ? "Updated" : "Added",
            before: previous ? { ...previous } : null,
            after: { ...saved_item },
        },
        ...history,
    ];

    listeners.forEach((listener) => listener());
    return saved_item;
}
