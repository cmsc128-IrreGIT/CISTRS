import type {
    CreateInventoryInput,
    InventoryItem,
    InventoryTransaction,
    UpdateInventoryInput,
} from "../types/inventory_types";

const API_BASE_URL = "http://localhost:5000/api";

async function handle_response<T>(
    response: Response,
): Promise<T> {
    if (!response.ok) {
        let message = "Something went wrong.";

        try {
            const data = await response.json();
            message = data.message ?? message;
        } catch {
            // Ignore invalid JSON responses and use the default error message.
        }

        throw new Error(message);
    }

    return response.json();
}

export async function get_inventory(
    search?: string,
): Promise<InventoryItem[]> {
    const params = new URLSearchParams();

    if (search?.trim()) {
        params.set("search", search.trim());
    }

    const query = params.toString();

    const response = await fetch(
        `${API_BASE_URL}/inventory/parts${query ? `?${query}` : ""}`,
    );

    return handle_response<InventoryItem[]>(response);
}

export async function get_inventory_item(
    part_UUID: string,
): Promise<InventoryItem> {
    const response = await fetch(
        `${API_BASE_URL}/inventory/parts/${encodeURIComponent(part_UUID)}`,
    );

    return handle_response<InventoryItem>(response);
}

export async function create_inventory_item(
    data: CreateInventoryInput,
): Promise<InventoryItem> {
    const response = await fetch(
        `${API_BASE_URL}/inventory/parts`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        },
    );

    return handle_response<InventoryItem>(response);
}

export async function update_inventory_item(
    part_UUID: string,
    data: UpdateInventoryInput,
): Promise<InventoryItem> {
    const response = await fetch(
        `${API_BASE_URL}/inventory/parts/${encodeURIComponent(part_UUID)}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        },
    );

    return handle_response<InventoryItem>(response);
}

export async function get_inventory_history(): Promise<
    InventoryTransaction[]
> {
    const response = await fetch(
        `${API_BASE_URL}/inventory/transactions`,
    );

    return handle_response<InventoryTransaction[]>(response);
}