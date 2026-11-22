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
    category?: string | null;
    expiry_date?: string | null;
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
    reference?: string | null;
    recipient?: string | null;
    supplier_name?: string | null;
    aircraft?: string | null;
    movement_date?: string | null;
    status: {
        status_UUID: string;
        current_quantity: number;
        part: {
            part_UUID: string;
            part_number: string;
            part_name: string;
            unit_of_measure?: string;
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
        m_name?: string | null;
        l_name: string;
        suffix?: string | null;
    };
};

export type InventoryRequestDecision =
    | { status: "APPROVED" }
    | { status: "RETURNED"; review_note: string };

export type InventoryRequestPreview = {
    request_UUID: string;
    kind: "RESTOCK" | "CORRECTION";
    status: "PENDING" | InventoryRequestDecision["status"];
    part: Pick<InventoryItem, "part_UUID" | "part_name" | "part_number" | "unit_of_measure">;
    location: Pick<InventoryLocation, "location_name" | "storage_area"> | null;
    quantity: number;
    recorded_quantity: number | null;
    needed_by: string | null;
    reason: string;
    reference: string | null;
    requester: string;
    reviewer: string | null;
    review_note: string | null;
    created_at: string;
    reviewed_at: string | null;
};
