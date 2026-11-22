import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpError.js";
import { prisma } from "../../lib/prisma.js";
import {
    AIRCRAFT_TAG_PREFIX,
    aircraftTag,
    assertLocationExists,
    assertPartExists,
    quantityField,
    remarksField,
    splitRemarks,
    withAircraftTag,
} from "./shared.js";

// -----------------------------------------------------------------------------
// BE-05: AIRCRAFT <-> INVENTORY RELATIONSHIPS
//   POST /api/inventory/parts/:part_UUID/aircraft                      (assign)
//   POST /api/inventory/parts/:part_UUID/aircraft/:aircraft_UUID/return (return)
//   GET  /api/inventory/parts/:part_UUID/aircraft     (aircraft a part is on)
//   GET  /api/inventory/aircraft/:aircraft_UUID/parts (parts on an aircraft)
//
//   Neither part nor inventory_status has an aircraft column, and the schema
//   must not change, so the association lives in the ledger:
//     assign = an ISSUE entry  (quantity_change < 0) tagged "[aircraft:<id>]"
//     return = a  RETURN entry (quantity_change > 0) tagged "[aircraft:<id>]"
//     quantity on aircraft = -(sum of the tagged entries)
//   A part is "associated" while that quantity is above 0. Inventory that was
//   never assigned simply has no tagged entries, so it exists without an
//   aircraft. If a real column is added later, only this section changes.

export const assignToAircraftSchema = z
    .object({
        aircraft_UUID: z.string().uuid("aircraft_UUID must be a valid UUID"),
        location_UUID: z.string().uuid("location_UUID must be a valid UUID"),
        quantity: quantityField("Quantity").min(1, "Quantity must be at least 1"),
        remarks: remarksField.optional(),
    })
    .strict();
export type AssignToAircraftInput = z.infer<typeof assignToAircraftSchema>;

export const returnFromAircraftSchema = assignToAircraftSchema.omit({
    aircraft_UUID: true,
});
export type ReturnFromAircraftInput = z.infer<typeof returnFromAircraftSchema>;

async function findAircraftOr404(aircraft_UUID: string) {
    const aircraft = await prisma.aircraft.findUnique({
        where: { aircraft_UUID },
        select: { aircraft_UUID: true, registration: true },
    });
    if (!aircraft) throw new HttpError(404, "Aircraft not found");
    return aircraft;
}

// How many of a part are on an aircraft right now.
async function quantityOnAircraft(
    db: Prisma.TransactionClient,
    part_UUID: string,
    aircraft_UUID: string,
) {
    const entries = await db.inventoryTransaction.findMany({
        where: {
            status: { part_UUID },
            remarks: { startsWith: aircraftTag(aircraft_UUID) },
        },
        select: { quantity_change: true },
    });
    return -entries.reduce((sum, entry) => sum + entry.quantity_change, 0);
}

// Assign (install / issue) stock of a part to an aircraft.
export async function assignPartToAircraft(
    part_UUID: string,
    input: AssignToAircraftInput,
    emp_UUID: string,
) {
    await assertPartExists(part_UUID);
    const aircraft = await findAircraftOr404(input.aircraft_UUID);

    const row = await prisma.inventoryStatus.findUnique({
        where: {
            part_UUID_location_UUID: {
                part_UUID,
                location_UUID: input.location_UUID,
            },
        },
        select: { status_UUID: true },
    });
    if (!row) {
        throw new HttpError(404, "This part has no stock at that location");
    }

    await prisma.$transaction(async (tx) => {
        // Atomic check-and-take: fails if there is not enough stock.
        const taken = await tx.inventoryStatus.updateMany({
            where: {
                status_UUID: row.status_UUID,
                current_quantity: { gte: input.quantity },
            },
            data: { current_quantity: { decrement: input.quantity } },
        });
        if (taken.count === 0) {
            throw new HttpError(400, "Insufficient stock at that location");
        }
        await tx.inventoryTransaction.create({
            data: {
                status_UUID: row.status_UUID,
                transaction_type: "ISSUE",
                quantity_change: -input.quantity,
                updated_by: emp_UUID,
                remarks: withAircraftTag(aircraft.aircraft_UUID, input.remarks),
            },
        });
    });

    return getPartAircraftLink(part_UUID, aircraft.aircraft_UUID);
}

// Return stock of a part from an aircraft back to a location.
export async function returnPartFromAircraft(
    part_UUID: string,
    aircraft_UUID: string,
    input: ReturnFromAircraftInput,
    emp_UUID: string,
) {
    await assertPartExists(part_UUID);
    const aircraft = await findAircraftOr404(aircraft_UUID);
    await assertLocationExists(input.location_UUID);

    await prisma.$transaction(async (tx) => {
        // One return at a time per part + aircraft, so two requests cannot
        // both return the same units.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${part_UUID}:${aircraft.aircraft_UUID}`}))`;

        const onAircraft = await quantityOnAircraft(
            tx,
            part_UUID,
            aircraft.aircraft_UUID,
        );
        if (input.quantity > onAircraft) {
            throw new HttpError(
                400,
                `Only ${onAircraft} of this part ${onAircraft === 1 ? "is" : "are"} assigned to this aircraft`,
            );
        }

        const status = await tx.inventoryStatus.upsert({
            where: {
                part_UUID_location_UUID: {
                    part_UUID,
                    location_UUID: input.location_UUID,
                },
            },
            create: {
                part_UUID,
                location_UUID: input.location_UUID,
                current_quantity: input.quantity,
            },
            update: { current_quantity: { increment: input.quantity } },
        });
        await tx.inventoryTransaction.create({
            data: {
                status_UUID: status.status_UUID,
                transaction_type: "RETURN",
                quantity_change: input.quantity,
                updated_by: emp_UUID,
                remarks: withAircraftTag(aircraft.aircraft_UUID, input.remarks),
            },
        });
    });

    return getPartAircraftLink(part_UUID, aircraft.aircraft_UUID);
}

async function getPartAircraftLink(part_UUID: string, aircraft_UUID: string) {
    const aircraft = await findAircraftOr404(aircraft_UUID);
    return {
        part_UUID,
        aircraft_UUID: aircraft.aircraft_UUID,
        registration: aircraft.registration,
        quantity_on_aircraft: await quantityOnAircraft(
            prisma,
            part_UUID,
            aircraft.aircraft_UUID,
        ),
    };
}

// Sums tagged ledger entries into "quantity on aircraft" per key.
function sumByAircraft<T extends { remarks: string | null; quantity_change: number }>(
    entries: T[],
    keyOf: (entry: T) => string,
) {
    const totals = new Map<string, number>();
    for (const entry of entries) {
        const { aircraft_UUID } = splitRemarks(entry.remarks);
        if (!aircraft_UUID) continue;
        const key = keyOf(entry);
        totals.set(key, (totals.get(key) ?? 0) - entry.quantity_change);
    }
    return totals;
}

// Which aircraft is this part on? (association retrieved from the part side)
export async function listAircraftForPart(part_UUID: string) {
    const part = await prisma.part.findUnique({
        where: { part_UUID },
        select: { part_UUID: true, part_number: true, part_name: true },
    });
    if (!part) throw new HttpError(404, "Part not found");

    const entries = await prisma.inventoryTransaction.findMany({
        where: {
            status: { part_UUID },
            remarks: { startsWith: AIRCRAFT_TAG_PREFIX },
        },
        select: { remarks: true, quantity_change: true },
    });
    const totals = sumByAircraft(
        entries,
        (entry) => splitRemarks(entry.remarks).aircraft_UUID!,
    );

    const ids = [...totals].filter(([, qty]) => qty > 0).map(([id]) => id);
    const aircraft = await prisma.aircraft.findMany({
        where: { aircraft_UUID: { in: ids } },
        orderBy: { registration: "asc" },
        select: { aircraft_UUID: true, registration: true },
    });

    return {
        ...part,
        aircraft: aircraft.map((a) => ({
            aircraft_UUID: a.aircraft_UUID,
            registration: a.registration,
            quantity_on_aircraft: totals.get(a.aircraft_UUID)!,
        })),
    };
}

// Which inventory is on this aircraft? (association queried from the aircraft side)
export async function listPartsForAircraft(aircraft_UUID: string) {
    const aircraft = await findAircraftOr404(aircraft_UUID);

    const entries = await prisma.inventoryTransaction.findMany({
        where: { remarks: { startsWith: aircraftTag(aircraft.aircraft_UUID) } },
        select: {
            remarks: true,
            quantity_change: true,
            status: { select: { part_UUID: true } },
        },
    });
    const totals = sumByAircraft(entries, (entry) => entry.status.part_UUID);

    const ids = [...totals].filter(([, qty]) => qty > 0).map(([id]) => id);
    const parts = await prisma.part.findMany({
        where: { part_UUID: { in: ids } },
        orderBy: { part_number: "asc" },
        select: {
            part_UUID: true,
            part_number: true,
            part_name: true,
            unit_of_measure: true,
        },
    });

    return {
        aircraft_UUID: aircraft.aircraft_UUID,
        registration: aircraft.registration,
        parts: parts.map((part) => ({
            ...part,
            quantity_on_aircraft: totals.get(part.part_UUID)!,
        })),
    };
}
