import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { HttpError } from "../lib/httpError.js";
import { prisma } from "../lib/prisma.js";

// =============================================================================
// Inventory service
//   Shared      : field rules, query shape, response mapper
//   BE-02       : create an inventory record (part, with optional initial stock)
//   BE-03       : retrieve inventory records (list + single)
//   BE-04       : update an inventory record
//   Supporting  : stock transaction history
// =============================================================================

// -----------------------------------------------------------------------------
// SHARED

// Field rules shared by the create and update schemas.
const partFields = z.object({
    part_number: z
        .string()
        .trim()
        .min(1, "Part number is required")
        .max(50, "Part number must be at most 50 characters"),
    part_name: z
        .string()
        .trim()
        .min(1, "Part name is required")
        .max(150, "Part name must be at most 150 characters"),
    unit_of_measure: z
        .string()
        .trim()
        .min(1, "Unit of measure is required")
        .max(20, "Unit of measure must be at most 20 characters"),
    min_stock_level: z
        .number("Minimum stock level must be a number")
        .int("Minimum stock level must be a whole number")
        .min(0, "Minimum stock level cannot be negative"),
    description: z
        .string()
        .trim()
        .max(500, "Description must be at most 500 characters")
        .optional(),
});

// What to load with a part. Used by both list and detail.
const partInclude = {
    inventory_status: { include: { location: true } },
    suppliers: { include: { supplier: { include: { organization: true } } } },
    manufacturers: {
        include: { manufacturer: { include: { organization: true } } },
    },
} satisfies Prisma.PartInclude;

type PartWithRelations = Prisma.PartGetPayload<{ include: typeof partInclude }>;

// One mapper for list, detail, create and update, so every endpoint returns the same shape for a part.
function toPartResponse(part: PartWithRelations) {
    const total_quantity = part.inventory_status.reduce(
        (sum, row) => sum + row.current_quantity,
        0,
    );
    return {
        part_UUID: part.part_UUID,
        part_number: part.part_number,
        part_name: part.part_name,
        unit_of_measure: part.unit_of_measure,
        min_stock_level: part.min_stock_level,
        description: part.description,
        total_quantity,
        is_low_stock: total_quantity < part.min_stock_level,
        locations: part.inventory_status.map((row) => ({
            status_UUID: row.status_UUID,
            location_UUID: row.location_UUID,
            location_name: row.location.location_name,
            storage_area: row.location.storage_area,
            current_quantity: row.current_quantity,
        })),
        suppliers: part.suppliers.map(
            (link) => link.supplier.organization.organization_name,
        ),
        manufacturers: part.manufacturers.map(
            (link) => link.manufacturer.organization.organization_name,
        ),
    };
}

// -----------------------------------------------------------------------------
// BE-02: CREATE
//   POST /api/inventory/parts

export const createPartSchema = partFields.extend({
    min_stock_level: partFields.shape.min_stock_level.default(0),
    // Optional starting stock: creates the stock row and a RECEIPT entry.
    initial_stock: z
        .object({
            location_UUID: z
                .string()
                .uuid("location_UUID must be a valid UUID"),
            quantity: z
                .number("Quantity must be a number")
                .int("Quantity must be a whole number")
                .min(1, "Quantity must be at least 1"),
        })
        .optional(),
});
export type CreatePartInput = z.infer<typeof createPartSchema>;

export async function createPart(input: CreatePartInput, emp_UUID: string) {
    // Friendly 409 instead of relying only on the DB unique constraint.
    const existing = await prisma.part.findUnique({
        where: { part_number: input.part_number },
        select: { part_UUID: true },
    });
    if (existing) throw new HttpError(409, "Part number already exists");

    if (input.initial_stock) {
        const location = await prisma.inventoryLocation.findUnique({
            where: { location_UUID: input.initial_stock.location_UUID },
            select: { location_UUID: true },
        });
        if (!location) throw new HttpError(404, "Location not found");
    }

    // All-or-nothing: no half-created records.
    const created = await prisma.$transaction(async (tx) => {
        const part = await tx.part.create({
            data: {
                part_number: input.part_number,
                part_name: input.part_name,
                unit_of_measure: input.unit_of_measure,
                min_stock_level: input.min_stock_level,
                description: input.description,
            },
        });

        if (input.initial_stock) {
            const { location_UUID, quantity } = input.initial_stock;

            const status = await tx.inventoryStatus.create({
                data: {
                    part_UUID: part.part_UUID,
                    location_UUID,
                    current_quantity: quantity,
                },
            });

            await tx.inventoryTransaction.create({
                data: {
                    status_UUID: status.status_UUID,
                    transaction_type: "RECEIPT",
                    quantity_change: quantity,
                    updated_by: emp_UUID,
                    remarks: "Initial stock on record creation",
                },
            });
        }

        return part;
    });

    // Same response shape as GET, including initial stock if any.
    return getPart(created.part_UUID);
}

// -----------------------------------------------------------------------------
// BE-03: RETRIEVE
//   GET /api/inventory/parts            (multiple, optional ?search=)
//   GET /api/inventory/parts/:part_UUID (single)

export const listPartsQuerySchema = z.object({
    search: z.string().trim().max(100).optional(),
});

// Multiple records. Optional case-insensitive partial match on number or name.
export async function listParts(search?: string) {
    const parts = await prisma.part.findMany({
        where: search
            ? {
                  OR: [
                      {
                          part_number: {
                              contains: search,
                              mode: "insensitive",
                          },
                      },
                      { part_name: { contains: search, mode: "insensitive" } },
                  ],
              }
            : undefined,
        orderBy: { part_number: "asc" },
        include: partInclude,
    });
    return parts.map(toPartResponse);
}

// Single record. A nonexistent ID gives a 404, not a crash.
export async function getPart(part_UUID: string) {
    const part = await prisma.part.findUnique({
        where: { part_UUID },
        include: partInclude,
    });
    if (!part) throw new HttpError(404, "Part not found");
    return toPartResponse(part);
}

// -----------------------------------------------------------------------------
// BE-04: UPDATE
//   PATCH /api/inventory/parts/:part_UUID

// Every field optional, unknown fields rejected, null clears the description.
// No defaults here, so fields that are not sent are never overwritten.
export const updatePartSchema = partFields
    .extend({ description: partFields.shape.description.nullable() })
    .partial()
    .strict()
    .refine(
        (data) => Object.keys(data).length > 0,
        "Provide at least one field to update",
    );
export type UpdatePartInput = z.infer<typeof updatePartSchema>;

export async function updatePart(part_UUID: string, input: UpdatePartInput) {
    const existing = await prisma.part.findUnique({
        where: { part_UUID },
        select: { part_number: true },
    });
    if (!existing) throw new HttpError(404, "Part not found");

    if (input.part_number && input.part_number !== existing.part_number) {
        const taken = await prisma.part.findUnique({
            where: { part_number: input.part_number },
            select: { part_UUID: true },
        });
        if (taken) throw new HttpError(409, "Part number already exists");
    }

    // Prisma only writes the fields present in `input`; the rest stay as is.
    await prisma.part.update({ where: { part_UUID }, data: input });

    // Return the same shape as retrieval.
    return getPart(part_UUID);
}

// -----------------------------------------------------------------------------
// SUPPORTING: stock transaction history
//   GET /api/inventory/transactions

export async function listTransactions() {
    return prisma.inventoryTransaction.findMany({
        orderBy: { created_at: "desc" },
        take: 50,
        include: {
            status: { include: { part: true, location: true } },
            updater: {
                select: { emp_number: true, f_name: true, l_name: true },
            },
        },
    });
}
