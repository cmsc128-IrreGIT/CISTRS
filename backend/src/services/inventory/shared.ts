import { z } from "zod";
import { HttpError } from "../../lib/httpError.js";
import { prisma } from "../../lib/prisma.js";

// =============================================================================
// Inventory: shared building blocks (no routes, no business flows)
export const AVAILABILITY = {
    InStock: "In Stock",
    LowStock: "Low Stock",
    OutOfStock: "Out of Stock",
    Available: "Available",
} as const;

export function partAvailability(total_quantity: number, min_stock_level: number) {
    if (total_quantity <= 0) return AVAILABILITY.OutOfStock;
    if (total_quantity < min_stock_level) return AVAILABILITY.LowStock;
    return AVAILABILITY.InStock;
}

export function locationAvailability(current_quantity: number) {
    return current_quantity > 0
        ? AVAILABILITY.Available
        : AVAILABILITY.OutOfStock;
}

// -----------------------------------------------------------------------------
// Field rules, aircraft tag and existence checks

const INT_MAX = 2_147_483_647; // inventory quantities are 32-bit ints in the DB

export const quantityField = (label: string) =>
    z
        .number(`${label} must be a number`)
        .int(`${label} must be a whole number`)
        .max(INT_MAX, `${label} is too large`);

export const remarksField = z
    .string()
    .trim()
    .max(500, "Remarks must be at most 500 characters")
    .refine(
        (value) => !value.toLowerCase().startsWith(AIRCRAFT_TAG_PREFIX),
        `Remarks cannot start with "${AIRCRAFT_TAG_PREFIX}"`,
    );

export async function assertPartExists(part_UUID: string) {
    const part = await prisma.part.findUnique({
        where: { part_UUID },
        select: { part_UUID: true },
    });
    if (!part) throw new HttpError(404, "Part not found");
}

export async function assertLocationExists(location_UUID: string) {
    const location = await prisma.inventoryLocation.findUnique({
        where: { location_UUID },
        select: { location_UUID: true },
    });
    if (!location) throw new HttpError(404, "Location not found");
}
