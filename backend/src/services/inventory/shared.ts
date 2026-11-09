import { z } from "zod";
import { HttpError } from "../../lib/httpError.js";
import { prisma } from "../../lib/prisma.js";

// =============================================================================
// Inventory: shared building blocks (no routes, no business flows)
//   Used by parts, stock, aircraft-links and history. This file imports from
//   none of them, so the dependency direction is always  shared -> the rest.
//
// The stock ledger (inventory_transaction) is the single source of truth:
//   - quantity     = inventory_status.current_quantity (always == sum of ledger)
//   - availability = derived from quantity (and the part's min_stock_level)
//   - history      = the ledger itself (append-only, no write endpoints)
//   - aircraft     = an ISSUE / RETURN ledger entry whose remarks start with
//                    "[aircraft:<aircraft_UUID>]" (see aircraft-links.service.ts)
// =============================================================================

// -----------------------------------------------------------------------------
// Availability

// Availability is DERIVED from quantity, so it can never disagree with it.
//   Part level     : "In Stock" | "Low Stock" (below min_stock_level) | "Out of Stock"
//   Location level : "Available" | "Out of Stock"
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

// Free-text remarks sent by a client. A client may NOT start its remarks with
// the aircraft tag: only the BE-05 endpoints are allowed to write that tag.
export const AIRCRAFT_TAG_PREFIX = "[aircraft:";
export const remarksField = z
    .string()
    .trim()
    .max(500, "Remarks must be at most 500 characters")
    .refine(
        (value) => !value.toLowerCase().startsWith(AIRCRAFT_TAG_PREFIX),
        `Remarks cannot start with "${AIRCRAFT_TAG_PREFIX}"`,
    );

const AIRCRAFT_TAG_PATTERN =
    /^\[aircraft:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\] ?/;

export function aircraftTag(aircraft_UUID: string) {
    return `${AIRCRAFT_TAG_PREFIX}${aircraft_UUID.toLowerCase()}]`;
}

export function withAircraftTag(aircraft_UUID: string, remarks?: string) {
    return remarks
        ? `${aircraftTag(aircraft_UUID)} ${remarks}`
        : aircraftTag(aircraft_UUID);
}

// Splits stored remarks into the aircraft they refer to (if any) and the
// human-readable text.
export function splitRemarks(stored: string | null) {
    const match = stored ? AIRCRAFT_TAG_PATTERN.exec(stored) : null;
    if (!stored || !match) {
        return { aircraft_UUID: null, remarks: stored };
    }
    const text = stored.slice(match[0].length).trim();
    return { aircraft_UUID: match[1], remarks: text === "" ? null : text };
}

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
