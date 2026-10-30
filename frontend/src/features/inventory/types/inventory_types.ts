export type InventoryLocation = {
    status_UUID: string;
    location_UUID: string;
    location_name: string;
    storage_area: string | null;
    current_quantity: number;
};

export type InventoryItem = {
    part_UUID: string;
    part_number: string;
    part_name: string;
    unit_of_measure: string;
    min_stock_level: number;
    description: string | null;
    total_quantity: number;
    is_low_stock: boolean;
    locations: InventoryLocation[];
    suppliers: string[];
    manufacturers: string[];
};

export type InventoryFormValues = {
    part_number: string;
    part_name: string;
    unit_of_measure: string;
    min_stock_level: number;
    description?: string | null;
};

export type InitialStock = {
    location_UUID: string;
    quantity: number;
};

export type CreateInventoryInput = InventoryFormValues & {
    initial_stock?: InitialStock;
};

export type UpdateInventoryInput = Partial<{
    part_number: string;
    part_name: string;
    unit_of_measure: string;
    min_stock_level: number;
    description: string | null;
}>;

export type InventoryTransaction = {
    transaction_UUID: string;
    transaction_type: string;
    quantity_change: number;
    updated_by: string;
    created_at: string;
    remarks: string | null;
    status: {
        status_UUID: string;
        current_quantity: number;
        part: {
            part_UUID: string;
            part_number: string;
            part_name: string;
        };
        location: {
            location_UUID: string;
            location_name: string;
            storage_area: string | null;
        };
    };
    updater: {
        emp_number: string;
        f_name: string;
        l_name: string;
    };
};
