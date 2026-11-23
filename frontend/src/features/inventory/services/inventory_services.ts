import { api_fetch, API_BASE_URL } from "../../../shared/api/client";
import type {
    CreateInventoryInput,
    InventoryItem,
    InventoryStorageLocation,
    InventoryAircraftLink,
    InventoryTransaction,
    UpdateInventoryInput,
} from "../types/inventory_types";

async function handle_response<T>(response: Response): Promise<T> {
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

export async function get_inventory_history(part_id?: string): Promise<InventoryTransaction[]> {
    const records: InventoryTransaction[] = [];
    const path = part_id ? `/inventory/parts/${encodeURIComponent(part_id)}/history` : "/inventory/transactions";
    const limit = 200;
    while (true) {
        const response = await api_fetch(`${API_BASE_URL}${path}?limit=${limit}&offset=${records.length}`);
        const total_header = response.headers.get("X-Total-Count");
        const page = await handle_response<(Omit<InventoryTransaction, "aircraft"> & { aircraft?: { aircraft_UUID: string; registration: string | null } | string | null })[]>(response);
        records.push(...page.map((row) => ({
            ...row,
            aircraft: typeof row.aircraft === "string" ? row.aircraft : row.aircraft?.registration ?? null,
            aircraft_UUID: typeof row.aircraft === "object" ? row.aircraft?.aircraft_UUID : null,
        })));
        if (!page.length || (total_header !== null && records.length >= Number(total_header)) || page.length < limit) return records;
    }
}

export async function get_inventory_locations(): Promise<InventoryStorageLocation[]> {
    return handle_response(await api_fetch(`${API_BASE_URL}/inventory/locations`));
}

export async function set_inventory_stock(part_id: string, location_id: string, quantity: number, remarks?: string) {
    return handle_response(await api_fetch(`${API_BASE_URL}/inventory/parts/${encodeURIComponent(part_id)}/stock/${encodeURIComponent(location_id)}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity, remarks }),
    }));
}

export async function assign_inventory_stock(part_id: string, aircraft_id: string, location_id: string, quantity: number, remarks?: string): Promise<InventoryAircraftLink> {
    return handle_response(await api_fetch(`${API_BASE_URL}/inventory/parts/${encodeURIComponent(part_id)}/aircraft`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aircraft_UUID: aircraft_id, location_UUID: location_id, quantity, remarks }),
    }));
}

export async function get_inventory_aircraft(part_id: string): Promise<InventoryAircraftLink[]> {
    const result = await handle_response<{ aircraft: InventoryAircraftLink[] }>(await api_fetch(`${API_BASE_URL}/inventory/parts/${encodeURIComponent(part_id)}/aircraft`));
    return result.aircraft;
}

export async function return_inventory_stock(part_id: string, aircraft_id: string, location_id: string, quantity: number, remarks?: string): Promise<InventoryAircraftLink> {
    return handle_response(await api_fetch(`${API_BASE_URL}/inventory/parts/${encodeURIComponent(part_id)}/aircraft/${encodeURIComponent(aircraft_id)}/return`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location_UUID: location_id, quantity, remarks }),
    }));
}
