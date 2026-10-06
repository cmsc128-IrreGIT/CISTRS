export type InventoryItem = {
    id: string;
    name: string;
    part_number: string;
    category: string;
    quantity: number;
    unit: string;
    aircraft: string | null;
};

export type InventoryFormValues = Omit<InventoryItem, "id">;

export type InventoryChange = {
    id: string;
    item_id: string;
    recorded_at: string;
    action: "Added" | "Updated";
    before: InventoryItem | null;
    after: InventoryItem;
};