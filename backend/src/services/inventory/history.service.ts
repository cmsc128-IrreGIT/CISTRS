import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpError.js";
import { prisma } from "../../lib/prisma.js";
import { aircraftTag, assertPartExists, splitRemarks } from "./shared.js";

// -----------------------------------------------------------------------------
// BE-07: INVENTORY CHANGE / HISTORY RECORDS
//   GET /api/inventory/transactions                       (filterable list)
//   GET /api/inventory/transactions/:transaction_UUID     (one record)
//   GET /api/inventory/parts/:part_UUID/history           (one part's history)
//
//   The history is the stock ledger. Entries are written only as a side effect
//   of real changes (create with stock, set quantity, assign / return) and are
//   append-only: the history routes accept GET only, so no one (not even an
//   authorized user) can edit or delete an entry through the API.

export const historyQuerySchema = z.object({
    part_UUID: z.string().uuid("part_UUID must be a valid UUID").optional(),
    status_UUID: z.string().uuid("status_UUID must be a valid UUID").optional(),
    location_UUID: z
        .string()
        .uuid("location_UUID must be a valid UUID")
        .optional(),
    aircraft_UUID: z
        .string()
        .uuid("aircraft_UUID must be a valid UUID")
        .optional(),
    transaction_type: z
        .enum(["RECEIPT", "ISSUE", "ADJUSTMENT", "RETURN", "TRANSFER"])
        .optional(),
    // ISO dates or timestamps; a date alone means 00:00 UTC of that day.
    from: z.coerce.date("from must be a valid date").optional(),
    to: z.coerce.date("to must be a valid date").optional(),
    limit: z.coerce
        .number("limit must be a number")
        .int("limit must be a whole number")
        .min(1, "limit must be at least 1")
        .max(200, "limit must be at most 200")
        .default(50),
    offset: z.coerce
        .number("offset must be a number")
        .int("offset must be a whole number")
        .min(0, "offset cannot be negative")
        .default(0),
});
export type HistoryQuery = z.infer<typeof historyQuerySchema>;

const transactionInclude = {
    status: {
        include: {
            part: {
                select: {
                    part_UUID: true,
                    part_number: true,
                    part_name: true,
                    unit_of_measure: true,
                },
            },
            location: {
                select: {
                    location_UUID: true,
                    location_name: true,
                    storage_area: true,
                },
            },
        },
    },
    updater: {
        select: { emp_UUID: true, emp_number: true, f_name: true, l_name: true },
    },
} satisfies Prisma.InventoryTransactionInclude;

type TransactionWithRelations = Prisma.InventoryTransactionGetPayload<{
    include: typeof transactionInclude;
}>;

// One mapper for every history endpoint. Each record names the affected
// inventory item (status + part + location), what changed, when and by whom.
async function toTransactionResponses(rows: TransactionWithRelations[]) {
    const parsed = rows.map((row) => ({ row, ...splitRemarks(row.remarks) }));

    const ids = [
        ...new Set(parsed.flatMap((p) => (p.aircraft_UUID ? [p.aircraft_UUID] : []))),
    ];
    const aircraft = ids.length
        ? await prisma.aircraft.findMany({
              where: { aircraft_UUID: { in: ids } },
              select: { aircraft_UUID: true, registration: true },
          })
        : [];
    const registrationOf = new Map(
        aircraft.map((a) => [a.aircraft_UUID, a.registration]),
    );

    return parsed.map(({ row, aircraft_UUID, remarks }) => ({
        transaction_UUID: row.transaction_UUID,
        status_UUID: row.status_UUID,
        transaction_type: row.transaction_type,
        quantity_change: row.quantity_change,
        created_at: row.created_at,
        remarks,
        aircraft: aircraft_UUID
            ? {
                  aircraft_UUID,
                  registration: registrationOf.get(aircraft_UUID) ?? null,
              }
            : null,
        status: {
            status_UUID: row.status.status_UUID,
            part: row.status.part,
            location: row.status.location,
        },
        updater: row.updater,
    }));
}

// Filtered, paged history (newest first) plus the total match count.
export async function listHistory(filters: HistoryQuery) {
    const statusFilter: Prisma.InventoryStatusWhereInput = {
        ...(filters.part_UUID ? { part_UUID: filters.part_UUID } : {}),
        ...(filters.location_UUID ? { location_UUID: filters.location_UUID } : {}),
    };
    const where: Prisma.InventoryTransactionWhereInput = {
        ...(filters.status_UUID ? { status_UUID: filters.status_UUID } : {}),
        ...(Object.keys(statusFilter).length ? { status: statusFilter } : {}),
        ...(filters.transaction_type
            ? { transaction_type: filters.transaction_type }
            : {}),
        ...(filters.aircraft_UUID
            ? { remarks: { startsWith: aircraftTag(filters.aircraft_UUID) } }
            : {}),
        ...(filters.from || filters.to
            ? {
                  created_at: {
                      ...(filters.from ? { gte: filters.from } : {}),
                      ...(filters.to ? { lte: filters.to } : {}),
                  },
              }
            : {}),
    };

    const [total, rows] = await Promise.all([
        prisma.inventoryTransaction.count({ where }),
        prisma.inventoryTransaction.findMany({
            where,
            orderBy: [{ created_at: "desc" }, { transaction_UUID: "desc" }],
            take: filters.limit,
            skip: filters.offset,
            include: transactionInclude,
        }),
    ]);
    return { total, records: await toTransactionResponses(rows) };
}

// History of one part (404 if the part does not exist).
export async function listPartHistory(part_UUID: string, filters: HistoryQuery) {
    await assertPartExists(part_UUID);
    return listHistory({ ...filters, part_UUID });
}

// One history record (404 if it does not exist).
export async function getHistoryRecord(transaction_UUID: string) {
    const row = await prisma.inventoryTransaction.findUnique({
        where: { transaction_UUID },
        include: transactionInclude,
    });
    if (!row) throw new HttpError(404, "History record not found");
    const [record] = await toTransactionResponses([row]);
    return record;
}
