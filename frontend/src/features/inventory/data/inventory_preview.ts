import type { InventoryItem } from "../types/inventory_types";

export const inventory_preview: InventoryItem[] = [
    {
        id: "sample-001",
        name: "Sample Oil Filter",
        part_number: "DEMO-OF-001",
        category: "Consumable",
        quantity: 8,
        unit: "pieces",
        aircraft: "Demo Aircraft A",
    },
    {
        id: "sample-002",
        name: "Sample Seal",
        part_number: "DEMO-SL-002",
        category: "Expendable",
        quantity: 0,
        unit: "pieces",
        aircraft: "Demo Aircraft B",
    },
    {
        id: "sample-003",
        name: "Sample Cleaning Supply",
        part_number: "DEMO-CS-003",
        category: "Supply",
        quantity: 12,
        unit: "bottles",
        aircraft: null,
    },
];
