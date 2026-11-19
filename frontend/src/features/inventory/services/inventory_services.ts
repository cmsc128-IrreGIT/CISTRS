import { api_fetch, API_BASE_URL } from "../../../shared/api/client";
import type {
    CreateInventoryInput,
    InventoryItem,
    InventoryTransaction,
    UpdateInventoryInput,
} from "../types/inventory_types";

async function handle_response<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let message = "Something went wrong.";

        try {
            const data = await response.json();
            message = data.message ?? message;
            if (Array.isArray(data.details)) {
                const details = data.details.map((issue: { field?: string; message?: string }) =>
                    [issue.field, issue.message].filter(Boolean).join(": ")).filter(Boolean);
                if (details.length) message += ": " + details.join("; ");
            }
        } catch {
            // Ignore invalid JSON responses and use the default error message.
        }

        throw new Error(message);
    }

    return response.json();
}

export async function get_inventory(search?: string): Promise<InventoryItem[]> {
    const params = new URLSearchParams();

    if (search?.trim()) {
        params.set("search", search.trim());
    }

    const query = params.toString();

    const response = await api_fetch(
        `${API_BASE_URL}/inventory/parts${query ? `?${query}` : ""}`,
    );

    return handle_response<InventoryItem[]>(response);
}

export async function get_inventory_item(
    part_UUID: string,
): Promise<InventoryItem> {
    const response = await api_fetch(
        `${API_BASE_URL}/inventory/parts/${encodeURIComponent(part_UUID)}`,
    );

    return handle_response<InventoryItem>(response);
}

export async function create_inventory_item(
    data: CreateInventoryInput,
): Promise<InventoryItem> {
    const response = await api_fetch(`${API_BASE_URL}/inventory/parts`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    return handle_response<InventoryItem>(response);
}

export async function update_inventory_item(
    part_UUID: string,
    data: UpdateInventoryInput,
): Promise<InventoryItem> {
    const response = await api_fetch(
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

export async function get_inventory_history(part_UUID?: string): Promise<InventoryTransaction[]> {
    const records: InventoryTransaction[] = [];
    while (true) {
        const query = new URLSearchParams({ limit: "200", offset: String(records.length) });
        if (part_UUID) query.set("part_UUID", part_UUID);
        const response = await api_fetch(`${API_BASE_URL}/inventory/transactions?${query}`);
        const page = await handle_response<(Omit<InventoryTransaction, "aircraft"> & {
            aircraft?: { aircraft_UUID: string; registration: string | null } | null;
        })[]>(response);
        records.push(...page.map((row) => ({ ...row, aircraft: row.aircraft?.registration ?? undefined })));
        if (page.length < 200) return records;
    }
}

export async function set_inventory_stock(part_UUID: string, location_UUID: string, quantity: number, remarks: string) {
    const response = await api_fetch(
        `${API_BASE_URL}/inventory/parts/${encodeURIComponent(part_UUID)}/stock/${encodeURIComponent(location_UUID)}`,
        { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity, remarks }) },
    );
    return handle_response<unknown>(response);
}

export async function issue_inventory_stock(part_UUID: string, aircraft_UUID: string, location_UUID: string, quantity: number, remarks: string) {
    const response = await api_fetch(
        `${API_BASE_URL}/inventory/parts/${encodeURIComponent(part_UUID)}/aircraft`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aircraft_UUID, location_UUID, quantity, remarks }) },
    );
    return handle_response<unknown>(response);
}

export type InventoryAircraftUsage = {
    aircraft_UUID: string;
    registration: string;
    quantity_on_aircraft: number;
};

export async function return_inventory_stock(part_UUID: string, aircraft_UUID: string, location_UUID: string, quantity: number, remarks: string) {
    const response = await api_fetch(
        `${API_BASE_URL}/inventory/parts/${encodeURIComponent(part_UUID)}/aircraft/${encodeURIComponent(aircraft_UUID)}/return`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location_UUID, quantity, remarks }) },
    );
    return handle_response<InventoryAircraftUsage>(response);
}

export async function get_inventory_aircraft(part_UUID: string) {
    const response = await api_fetch(`${API_BASE_URL}/inventory/parts/${encodeURIComponent(part_UUID)}/aircraft`);
    const result = await handle_response<{ aircraft: InventoryAircraftUsage[] }>(response);
    return result.aircraft;
}
