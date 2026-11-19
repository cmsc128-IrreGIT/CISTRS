import { prisma } from "../../lib/prisma.js";

// -----------------------------------------------------------------------------
// INVENTORY LOCATIONS
//   GET /api/inventory/locations
//
//   The single source of truth for location_UUID values. Feeds the pickers for
//   initial_stock (part create), set stock, and assign / return.
//   Every location is returned (including ones that hold no stock yet),
//   not paged, ordered by location_name then storage_area.

export async function listLocations() {
    return prisma.inventoryLocation.findMany({
        orderBy: [{ location_name: "asc" }, { storage_area: "asc" }],
        select: {
            location_UUID: true,
            location_name: true,
            storage_area: true,
        },
    });
}
