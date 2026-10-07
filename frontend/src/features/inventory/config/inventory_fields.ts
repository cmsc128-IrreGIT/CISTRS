import type { InventoryItem } from "../types/inventory_types";

type InventoryDetailField = {
    id: string;
    label: string;
    get_value: (item: InventoryItem) => string;
};

export const inventory_detail_fields: InventoryDetailField[] = [
    {
        id: "part_number",
        label: "Part Number",
        get_value: (item) => item.part_number,
    },
    {
        id: "category",
        label: "Category",
        get_value: (item) => item.category,
    },
    {
        id: "quantity",
        label: "Quantity",
        get_value: (item) => `${item.quantity} ${item.unit}`,
    },
    {
        id: "aircraft",
        label: "Associated Aircraft",
        get_value: (item) => item.aircraft ?? "Unassigned",
    },
];

export const inventory_search_fields = [
    "name",
    "part_number",
    "category",
] as const satisfies readonly (keyof InventoryItem)[];
