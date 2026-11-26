import type {
    InventoryItem,
    InventoryLocation,
} from "../types/inventory_types";

export function get_inventory_locations(
    items: InventoryItem[],
): InventoryLocation[] {
    const locations = new Map<string, InventoryLocation>();
    for (const item of items) {
        for (const location of item.locations) {
            locations.set(location.location_UUID, location);
        }
    }
    return Array.from(locations.values());
}

export function inventory_location_label(location: {
    location_name: string;
    storage_area: string | null;
}) {
    return location.storage_area
        ? `${location.location_name} / ${location.storage_area}`
        : location.location_name;
}

export function inventory_today() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
}

export function inventory_request_date(value: string | null) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.valueOf())
        ? "—"
        : date.toLocaleDateString("en-GB", {
              dateStyle: "medium",
              timeZone: "UTC",
          });
}

export function can_review_inventory_requests(position: string) {
    return /\b(admin|administrator|accountable manager|president|ceo|inventory officer)\b/i.test(
        position,
    );
}
