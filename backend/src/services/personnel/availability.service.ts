import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpError.js";
import { prisma } from "../../lib/prisma.js";
import {
    dateField,
    throwIfIssues,
    toDbDate,
    uuidField,
} from "../common/fields.js";

// =============================================================================
// Employee Availability Service
//   CRUD for date-based availability records (EmployeeAvailability model)
// =============================================================================

export const createAvailabilitySchema = z
    .object({
        emp_UUID: uuidField("emp_UUID"),
        date: dateField("date"),
        status: z.enum(
            ["Available", "Unavailable"],
            "Status must be Available or Unavailable",
        ),
        notes: z
            .string()
            .max(500, "Notes must be at most 500 characters")
            .optional()
            .nullable(),
    })
    .strict();

export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;

export const updateAvailabilitySchema = z
    .object({
        status: z
            .enum(
                ["Available", "Unavailable"],
                "Status must be Available or Unavailable",
            )
            .optional(),
        notes: z
            .string()
            .max(500, "Notes must be at most 500 characters")
            .nullable()
            .optional(),
    })
    .partial()
    .strict()
    .refine(
        (input) => Object.values(input).some((value) => value !== undefined),
        "At least one field must be provided",
    );

export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;

const availabilitySelect = {
    availability_UUID: true,
    emp_UUID: true,
    date: true,
    status: true,
    notes: true,
    created_at: true,
    updated_at: true,
} satisfies Prisma.EmployeeAvailabilitySelect;

function toAvailabilityResponse(
    record: Prisma.EmployeeAvailabilityGetPayload<{
        select: typeof availabilitySelect;
    }>,
) {
    return {
        ...record,
        date: record.date.toISOString().slice(0, 10),
    };
}

async function findAvailabilityOr404(availability_UUID: string) {
    const record = await prisma.employeeAvailability.findUnique({
        where: { availability_UUID },
        select: availabilitySelect,
    });
    if (!record) throw new HttpError(404, "Availability record not found");
    return record;
}

async function assertEmployeeExists(emp_UUID: string) {
    const employee = await prisma.employee.findUnique({
        where: { emp_UUID },
        select: { emp_UUID: true, record_status: true },
    });
    if (!employee) throw new HttpError(404, "Employee not found");
    if (employee.record_status !== "Active")
        throw new HttpError(400, "Employee is not active");
    return employee;
}

// -----------------------------------------------------------------------------
// CREATE
// POST /api/personnel/availability

export async function createAvailability(
    input: CreateAvailabilityInput,
    actor_emp_UUID: string,
) {
    await assertEmployeeExists(input.emp_UUID);

    // Check for existing record on same date
    const existing = await prisma.employeeAvailability.findUnique({
        where: {
            emp_UUID_date: {
                emp_UUID: input.emp_UUID,
                date: toDbDate(input.date),
            },
        },
        select: { availability_UUID: true },
    });
    if (existing)
        throw new HttpError(
            409,
            "Availability record for this date already exists",
        );

    const created = await prisma.employeeAvailability.create({
        data: {
            emp_UUID: input.emp_UUID,
            date: toDbDate(input.date),
            status: input.status,
            notes: input.notes ?? null,
        },
        select: availabilitySelect,
    });

    return toAvailabilityResponse(created);
}

// -----------------------------------------------------------------------------
// LIST
// GET /api/personnel/availability?emp_UUID=&from=&to=

export const listAvailabilityQuerySchema = z.object({
    emp_UUID: uuidField("emp_UUID").optional(),
    from: dateField("from").optional(),
    to: dateField("to").optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100).optional(),
    offset: z.coerce.number().int().min(0).default(0).optional(),
});

export type ListAvailabilityQuery = z.infer<typeof listAvailabilityQuerySchema>;

export async function listAvailability(query: ListAvailabilityQuery) {
    const where: Prisma.EmployeeAvailabilityWhereInput = {};

    if (query.emp_UUID) {
        where.emp_UUID = query.emp_UUID;
    }

    if (query.from || query.to) {
        where.date = {};
        if (query.from) where.date.gte = toDbDate(query.from);
        if (query.to) where.date.lte = toDbDate(query.to);
    }

    const [total, records] = await prisma.$transaction([
        prisma.employeeAvailability.count({ where }),
        prisma.employeeAvailability.findMany({
            where,
            orderBy: { date: "asc" },
            select: availabilitySelect,
            skip: query.offset,
            take: query.limit,
        }),
    ]);

    return { total, records: records.map(toAvailabilityResponse) };
}

// -----------------------------------------------------------------------------
// GET SINGLE
// GET /api/personnel/availability/:availability_UUID

export async function getAvailability(availability_UUID: string) {
    return toAvailabilityResponse(
        await findAvailabilityOr404(availability_UUID),
    );
}

// -----------------------------------------------------------------------------
// UPDATE
// PATCH /api/personnel/availability/:availability_UUID

export async function updateAvailability(
    availability_UUID: string,
    input: UpdateAvailabilityInput,
    actor_emp_UUID: string,
) {
    const existing = await findAvailabilityOr404(availability_UUID);

    // If updating status, no additional validation needed

    const data: Prisma.EmployeeAvailabilityUncheckedUpdateInput = {
        ...input,
    };

    if (Object.keys(data).length === 0) {
        return toAvailabilityResponse(existing);
    }

    const updated = await prisma.employeeAvailability.update({
        where: { availability_UUID },
        data,
        select: availabilitySelect,
    });

    return toAvailabilityResponse(updated);
}

// -----------------------------------------------------------------------------
// DELETE
// DELETE /api/personnel/availability/:availability_UUID

export async function deleteAvailability(
    availability_UUID: string,
    actor_emp_UUID: string,
) {
    await findAvailabilityOr404(availability_UUID);
    await prisma.employeeAvailability.delete({ where: { availability_UUID } });
    return { deleted: true };
}
