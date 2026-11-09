import { z } from "zod";
import { HttpError } from "../../lib/httpError.js";
import { prisma } from "../../lib/prisma.js";
import { getPart } from "./parts.service.js";
import {
    assertLocationExists,
    assertPartExists,
    quantityField,
    remarksField,
} from "./shared.js";

// -----------------------------------------------------------------------------
// BE-06: QUANTITY AND AVAILABILITY TRACKING
//   GET /api/inventory/parts/:part_UUID/stock
//   PUT /api/inventory/parts/:part_UUID/stock/:location_UUID
//
//   Quantity is stored per part + location (inventory_status.current_quantity).
//   Availability is derived from it, so updating quantity updates availability.
//   Every change is written to the ledger as an ADJUSTMENT, so quantity always
//   equals the sum of the ledger (the invariant the seeder verifies).

export const setStockSchema = z
    .object({
        quantity: quantityField("Quantity").min(0, "Quantity cannot be negative"),
        remarks: remarksField.optional(),
    })
    .strict();
export type SetStockInput = z.infer<typeof setStockSchema>;

// Quantity + availability for one part, in total and per location.
export async function getStock(part_UUID: string) {
    const part = await getPart(part_UUID);
    return {
        part_UUID: part.part_UUID,
        part_number: part.part_number,
        part_name: part.part_name,
        unit_of_measure: part.unit_of_measure,
        min_stock_level: part.min_stock_level,
        total_quantity: part.total_quantity,
        availability: part.availability,
        is_low_stock: part.is_low_stock,
        locations: part.locations,
    };
}

// Sets the quantity of a part at a location (creates the stock row if the part
// has never been stored there). Returns the part's updated stock view.
export async function setStock(
    part_UUID: string,
    location_UUID: string,
    input: SetStockInput,
    emp_UUID: string,
) {
    await assertPartExists(part_UUID);
    await assertLocationExists(location_UUID);

    await prisma.$transaction(async (tx) => {
        const row = await tx.inventoryStatus.findUnique({
            where: { part_UUID_location_UUID: { part_UUID, location_UUID } },
        });
        const before = row?.current_quantity ?? 0;
        const delta = input.quantity - before;

        let status_UUID: string;
        if (!row) {
            const created = await tx.inventoryStatus.create({
                data: { part_UUID, location_UUID, current_quantity: input.quantity },
            });
            status_UUID = created.status_UUID;
        } else {
            status_UUID = row.status_UUID;
            if (delta !== 0) {
                // Only write if nobody changed the row since we read it.
                const result = await tx.inventoryStatus.updateMany({
                    where: { status_UUID, current_quantity: before },
                    data: { current_quantity: input.quantity },
                });
                if (result.count === 0) {
                    throw new HttpError(
                        409,
                        "Stock was changed by someone else. Please retry.",
                    );
                }
            }
        }

        // No change -> nothing to record (the ledger never holds a zero entry).
        if (delta !== 0) {
            await tx.inventoryTransaction.create({
                data: {
                    status_UUID,
                    transaction_type: "ADJUSTMENT",
                    quantity_change: delta,
                    updated_by: emp_UUID,
                    remarks:
                        input.remarks ??
                        `Quantity set from ${before} to ${input.quantity}`,
                },
            });
        }
    });

    return getStock(part_UUID);
}
