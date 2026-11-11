import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { HttpError } from "../lib/httpError.js";
import { prisma } from "../lib/prisma.js";
import {
    dateField,
    textField,
    throwIfIssues,
    todayUtc,
    toDbDate,
    uuidField,
    type RuleIssue,
} from "./common/fields.js";
import { employeeSummarySelect } from "./common/lookups.js";


const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

// Must match the CHECK constraint employee_blood_type_valid in the database.
const bloodTypeField = z.enum(BLOOD_TYPES, "Blood type must be one of A+, A-, B+, B-, AB+, AB-, O+, O-");

const employeeFields = {
    // Stored upper-case, e.g. "SA-0042".
    emp_number: z
        .string("Employee number must be text")
        .trim()
        .toUpperCase()
        .max(20, "Employee number must be at most 20 characters")
        .regex(/^SA-\d{4,}$/, "Employee number must look like SA-0001"),
    f_name: textField("First name", 100),
    m_name: textField("Middle name", 100),
    l_name: textField("Last name", 100),
    suffix: textField("Suffix", 20),
    date_of_birth: dateField("Date of birth").refine(
        (value) => value <= todayUtc(),
        "Date of birth cannot be in the future",
    ),
    sex: z.enum(["Male", "Female"], "Sex must be Male or Female"),
    blood_type: bloodTypeField,
    photo: textField("Photo", 500),
    date_hired: dateField("Date hired"),
    department: textField("Department", 100),
    record_status: z.enum(
        ["Active", "Inactive"],
        "Record status must be Active or Inactive",
    ),
    supervisor_emp_UUID: uuidField("supervisor_emp_UUID"),
    base_UUID: uuidField("base_UUID"),
    emp_status_UUID: uuidField("emp_status_UUID"),
    position_UUID: uuidField("position_UUID"),
    personnel_category_UUID: uuidField("personnel_category_UUID"),
};

// Detail used by list, single, create and update, so every endpoint returns
// the same shape.
const employeeInclude = {
    base: true,
    employment_status: true,
    personnel_category: true,
    position: { select: { position_UUID: true, position_name: true } },
    supervisor: { select: employeeSummarySelect },
    contacts: { include: { contact: true } },
    licenses: { include: { license_type: true } },
} satisfies Prisma.EmployeeInclude;

type EmployeeWithRelations = Prisma.EmployeeGetPayload<{
    include: typeof employeeInclude;
}>;

const day = (value: Date) => value.toISOString().slice(0, 10);

function toEmployeeResponse(employee: EmployeeWithRelations) {
    const { personnel_category, ...rest } = employee;
    return {
        ...rest,
        // DATE columns are sent as "YYYY-MM-DD", the same format they are accepted in.
        date_of_birth: day(employee.date_of_birth),
        date_hired: day(employee.date_hired),
        // personnel_category is a lookup table. The category name keeps being
        // returned under the same field; personnel_category_UUID is included too.
        personnel_category: personnel_category.category_name,
    };
}

async function findEmployeeOr404(emp_UUID: string) {
    const employee = await prisma.employee.findUnique({
        where: { emp_UUID },
        include: employeeInclude,
    });
    if (!employee) throw new HttpError(404, "Employee not found");
    return employee;
}

// Cross-field rule (also enforced by the database): hired on or after birth.
function dateIssues(date_of_birth: string, date_hired: string): RuleIssue[] {
    return date_hired < date_of_birth
        ? [
              {
                  field: "date_hired",
                  message: "Date hired cannot be before the date of birth",
              },
          ]
        : [];
}

interface References {
    base_UUID?: string;
    emp_status_UUID?: string;
    position_UUID?: string;
    personnel_category_UUID?: string;
    supervisor_emp_UUID?: string | null;
}

// Every referenced record must exist (404) and, where it can be switched off,
// be active (400). Only IDs that are being set are checked, so an unchanged
// reference to a base or position that was deactivated later does not block
// unrelated edits.
async function assertReferences(refs: References, selfId?: string) {
    if (refs.base_UUID) {
        const base = await prisma.base.findUnique({
            where: { base_UUID: refs.base_UUID },
            select: { base_status: true },
        });
        if (!base) throw new HttpError(404, "Base not found");
        if (base.base_status !== "Active") {
            throw new HttpError(400, "Base is not active");
        }
    }

    if (refs.emp_status_UUID) {
        const status = await prisma.employmentStatus.findUnique({
            where: { emp_status_UUID: refs.emp_status_UUID },
            select: { emp_status_UUID: true },
        });
        if (!status) throw new HttpError(404, "Employment status not found");
    }

    if (refs.personnel_category_UUID) {
        const category = await prisma.personnelCategory.findUnique({
            where: { personnel_category_UUID: refs.personnel_category_UUID },
            select: { personnel_category_UUID: true },
        });
        if (!category) throw new HttpError(404, "Personnel category not found");
    }

    if (refs.position_UUID) {
        const position = await prisma.position.findUnique({
            where: { position_UUID: refs.position_UUID },
            select: { is_active: true },
        });
        if (!position) throw new HttpError(404, "Position not found");
        if (!position.is_active) {
            throw new HttpError(400, "Position is not active");
        }
    }

    if (refs.supervisor_emp_UUID) {
        const supervisorId = refs.supervisor_emp_UUID;
        if (selfId && supervisorId === selfId) {
            throw new HttpError(400, "An employee cannot be their own supervisor");
        }

        const supervisor = await prisma.employee.findUnique({
            where: { emp_UUID: supervisorId },
            select: { record_status: true },
        });
        if (!supervisor) throw new HttpError(404, "Supervisor not found");
        if (supervisor.record_status !== "Active") {
            throw new HttpError(400, "Supervisor is not an active employee");
        }

        // Walk up the reporting line: it must never lead back to this employee.
        if (selfId) {
            const seen = new Set<string>();
            let cursor: string | null = supervisorId;
            while (cursor && !seen.has(cursor)) {
                if (cursor === selfId) {
                    throw new HttpError(
                        400,
                        "This supervisor assignment would create a reporting loop",
                    );
                }
                seen.add(cursor);
                const row: { supervisor_emp_UUID: string | null } | null =
                    await prisma.employee.findUnique({
                        where: { emp_UUID: cursor },
                        select: { supervisor_emp_UUID: true },
                    });
                cursor = row?.supervisor_emp_UUID ?? null;
            }
        }
    }
}

// Duplicate rules (409):
//   1. the employee number is already used (case-insensitive)
//   2. someone with the same first name, last name and date of birth exists
// `excludeId` is the record being updated, so it never conflicts with itself.
async function assertNoDuplicate(
    check: {
        emp_number?: string;
        f_name?: string;
        l_name?: string;
        date_of_birth?: string;
    },
    excludeId?: string,
) {
    const notSelf = excludeId ? { NOT: { emp_UUID: excludeId } } : {};

    if (check.emp_number !== undefined) {
        const sameNumber = await prisma.employee.findFirst({
            where: {
                emp_number: { equals: check.emp_number, mode: "insensitive" },
                ...notSelf,
            },
            select: { emp_UUID: true },
        });
        if (sameNumber) {
            throw new HttpError(409, "Employee number already exists");
        }
    }

    if (
        check.f_name !== undefined &&
        check.l_name !== undefined &&
        check.date_of_birth !== undefined
    ) {
        const sameIdentity = await prisma.employee.findFirst({
            where: {
                f_name: { equals: check.f_name, mode: "insensitive" },
                l_name: { equals: check.l_name, mode: "insensitive" },
                date_of_birth: toDbDate(check.date_of_birth),
                ...notSelf,
            },
            select: { emp_UUID: true, emp_number: true },
        });
        if (sameIdentity) {
            throw new HttpError(
                409,
                "An employee with the same name and date of birth already exists",
                {
                    emp_UUID: sameIdentity.emp_UUID,
                    emp_number: sameIdentity.emp_number,
                },
            );
        }
    }
}

// -----------------------------------------------------------------------------
// BE-26: CREATE
//   POST /api/personnel/employees

export const createEmployeeSchema = z
    .object({
        emp_number: employeeFields.emp_number,
        f_name: employeeFields.f_name,
        m_name: employeeFields.m_name.nullish(),
        l_name: employeeFields.l_name,
        suffix: employeeFields.suffix.nullish(),
        date_of_birth: employeeFields.date_of_birth,
        sex: employeeFields.sex,
        blood_type: employeeFields.blood_type.nullish(),
        photo: employeeFields.photo.nullish(),
        date_hired: employeeFields.date_hired,
        department: employeeFields.department,
        record_status: employeeFields.record_status.default("Active"),
        supervisor_emp_UUID: employeeFields.supervisor_emp_UUID.nullish(),
        base_UUID: employeeFields.base_UUID,
        emp_status_UUID: employeeFields.emp_status_UUID,
        position_UUID: employeeFields.position_UUID,
        personnel_category_UUID: employeeFields.personnel_category_UUID,
    })
    .strict();
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export async function createEmployee(
    input: CreateEmployeeInput,
    actor_emp_UUID: string,
) {
    throwIfIssues(dateIssues(input.date_of_birth, input.date_hired));

    await assertNoDuplicate(input);
    await assertReferences(input);

    const created = await prisma.employee.create({
        data: {
            emp_number: input.emp_number,
            f_name: input.f_name,
            m_name: input.m_name ?? null,
            l_name: input.l_name,
            suffix: input.suffix ?? null,
            date_of_birth: toDbDate(input.date_of_birth),
            sex: input.sex,
            blood_type: input.blood_type ?? null,
            photo: input.photo ?? null,
            date_hired: toDbDate(input.date_hired),
            department: input.department,
            record_status: input.record_status,
            supervisor_emp_UUID: input.supervisor_emp_UUID ?? null,
            base_UUID: input.base_UUID,
            emp_status_UUID: input.emp_status_UUID,
            position_UUID: input.position_UUID,
            personnel_category_UUID: input.personnel_category_UUID,
            created_by: actor_emp_UUID,
            updated_by: actor_emp_UUID,
        },
        select: { emp_UUID: true },
    });

    // Same response shape as GET.
    return toEmployeeResponse(await findEmployeeOr404(created.emp_UUID));
}

// -----------------------------------------------------------------------------
// BE-27: RETRIEVE
//   GET /api/personnel/employees              (list, optional filters and paging)
//   GET /api/personnel/employees/:emp_UUID    (single)

export const listEmployeesQuerySchema = z.object({
    record_status: z
        .enum(["Active", "Inactive"], "record_status must be Active or Inactive")
        .optional(),
    personnel_category_UUID: uuidField("personnel_category_UUID").optional(),
    base_UUID: uuidField("base_UUID").optional(),
    // Case-insensitive partial match on employee number or name. Several words
    // must each match something ("adrian reyes").
    q: z.string().trim().max(100, "q must be at most 100 characters").optional(),
    // Without a limit every matching record is returned, as before.
    limit: z.coerce
        .number("limit must be a number")
        .int("limit must be a whole number")
        .min(1, "limit must be at least 1")
        .max(200, "limit must be at most 200")
        .optional(),
    offset: z.coerce
        .number("offset must be a number")
        .int("offset must be a whole number")
        .min(0, "offset cannot be negative")
        .default(0),
});
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;

// Returns the page of records plus the total number of matches
// (the route sends the total in the X-Total-Count header).
export async function listEmployees(query: ListEmployeesQuery) {
    const tokens = (query.q ?? "").split(/\s+/).filter(Boolean);

    const where: Prisma.EmployeeWhereInput = {
        record_status: query.record_status,
        personnel_category_UUID: query.personnel_category_UUID,
        base_UUID: query.base_UUID,
        AND: tokens.map((token) => ({
            OR: [
                { emp_number: { contains: token, mode: "insensitive" as const } },
                { f_name: { contains: token, mode: "insensitive" as const } },
                { m_name: { contains: token, mode: "insensitive" as const } },
                { l_name: { contains: token, mode: "insensitive" as const } },
            ],
        })),
    };

    const [total, employees] = await prisma.$transaction([
        prisma.employee.count({ where }),
        prisma.employee.findMany({
            where,
            orderBy: { emp_number: "asc" },
            include: employeeInclude,
            skip: query.offset,
            take: query.limit,
        }),
    ]);

    return { total, records: employees.map(toEmployeeResponse) };
}

// A nonexistent ID gives a 404, not a crash.
export async function getEmployee(emp_UUID: string) {
    return toEmployeeResponse(await findEmployeeOr404(emp_UUID));
}

// -----------------------------------------------------------------------------
// BE-28: UPDATE
//   PATCH /api/personnel/employees/:emp_UUID
//   Any subset of the fields. Unsent fields stay as they are; null clears the
//   optional ones (middle name, suffix, blood type, photo, supervisor).

export const updateEmployeeSchema = z
    .object({
        emp_number: employeeFields.emp_number,
        f_name: employeeFields.f_name,
        m_name: employeeFields.m_name.nullable(),
        l_name: employeeFields.l_name,
        suffix: employeeFields.suffix.nullable(),
        date_of_birth: employeeFields.date_of_birth,
        sex: employeeFields.sex,
        blood_type: employeeFields.blood_type.nullable(),
        photo: employeeFields.photo.nullable(),
        date_hired: employeeFields.date_hired,
        department: employeeFields.department,
        record_status: employeeFields.record_status,
        supervisor_emp_UUID: employeeFields.supervisor_emp_UUID.nullable(),
        base_UUID: employeeFields.base_UUID,
        emp_status_UUID: employeeFields.emp_status_UUID,
        position_UUID: employeeFields.position_UUID,
        personnel_category_UUID: employeeFields.personnel_category_UUID,
    })
    .partial()
    .strict()
    .refine(
        (input) => Object.values(input).some((value) => value !== undefined),
        "At least one field must be provided",
    );
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

const DATE_KEYS = ["date_of_birth", "date_hired"] as const;

export async function updateEmployee(
    emp_UUID: string,
    input: UpdateEmployeeInput,
    actor_emp_UUID: string,
) {
    const existing = await findEmployeeOr404(emp_UUID);

    // The current values in the same form the API accepts them in.
    const current: Record<string, unknown> = {
        ...existing,
        date_of_birth: day(existing.date_of_birth),
        date_hired: day(existing.date_hired),
    };

    // Only fields that were sent AND differ from what is stored.
    const changes: UpdateEmployeeInput = {};
    for (const key of Object.keys(input) as (keyof UpdateEmployeeInput)[]) {
        if (input[key] !== undefined && input[key] !== current[key]) {
            Object.assign(changes, { [key]: input[key] });
        }
    }

    // Nothing to change: leave the record, and its audit columns, untouched.
    if (Object.keys(changes).length === 0) {
        return toEmployeeResponse(existing);
    }

    // The final dates (changed or not) must still make sense together.
    throwIfIssues(
        dateIssues(
            changes.date_of_birth ?? day(existing.date_of_birth),
            changes.date_hired ?? day(existing.date_hired),
        ),
    );

    // Deactivating yourself would lock you out of the system.
    if (
        changes.record_status === "Inactive" &&
        emp_UUID === actor_emp_UUID
    ) {
        throw new HttpError(400, "You cannot deactivate your own record");
    }

    // Duplicate checks run on the final name and birth date when any of them changes.
    const identityChanged =
        changes.f_name !== undefined ||
        changes.l_name !== undefined ||
        changes.date_of_birth !== undefined;
    await assertNoDuplicate(
        {
            emp_number: changes.emp_number,
            ...(identityChanged
                ? {
                      f_name: changes.f_name ?? existing.f_name,
                      l_name: changes.l_name ?? existing.l_name,
                      date_of_birth:
                          changes.date_of_birth ??
                          day(existing.date_of_birth),
                  }
                : {}),
        },
        emp_UUID,
    );

    await assertReferences(changes, emp_UUID);

    const data: Prisma.EmployeeUncheckedUpdateInput = {
        ...changes,
        updated_by: actor_emp_UUID,
    };
    for (const key of DATE_KEYS) {
        const value = changes[key];
        if (value !== undefined) data[key] = toDbDate(value);
    }

    await prisma.employee.update({ where: { emp_UUID }, data });

    return toEmployeeResponse(await findEmployeeOr404(emp_UUID));
}


export async function listExpiringLicenses(days: number) {
    const limit = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return await prisma.employeeLicense.findMany({
        where: { expiry_date: { not: null, lte: limit } },
        orderBy: { expiry_date: "asc" },
        include: {
            license_type: true,
            employee: {
                select: { emp_number: true, f_name: true, l_name: true },
            },
        },
    });
}
