import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

// =============================================================================
// Staff directory service
//   Basic work details of active employees, readable by any authenticated
//   account (no Personnel feature). Feeds the pilot / mechanic dropdowns, the
//   fuel `issued_to` picker and the supervisor field.
//   Never returns sensitive Personnel data (birth date, blood type, contacts...).
// =============================================================================

// An empty value (`?category=` or `?q=`) is treated as "not sent".
const optionalText = (label: string, max: number) =>
    z
        .string(`${label} must be text`)
        .trim()
        .max(max, `${label} must be at most ${max} characters`)
        .transform((value) => (value === "" ? undefined : value))
        .optional();

export const listStaffDirectoryQuerySchema = z.object({
    // Exact category name, case-insensitive: "Pilot", "Aircraft Maintenance Technician".
    // An unknown name matches nobody and gives an empty list.
    category: optionalText("category", 100),
    // Case-insensitive partial match on employee number or name. Several words
    // must each match something ("adrian reyes"), same as the Personnel list.
    q: optionalText("q", 100),
});
export type ListStaffDirectoryQuery = z.infer<typeof listStaffDirectoryQuerySchema>;

// Fields returned for each employee. Shared with the eligible-employees list in
// user.service.ts so both endpoints return the same shape.
export const staffDirectorySelect = {
    emp_UUID: true,
    emp_number: true,
    f_name: true,
    m_name: true,
    l_name: true,
    suffix: true,
    position: { select: { position_name: true } },
    personnel_category: { select: { category_name: true } },
    department: true,
    base: { select: { base_name: true } },
} satisfies Prisma.EmployeeSelect;

// Same as the gated personnel endpoint: the category is returned as its
// plain name string, not as a nested object.
export function toStaffDirectoryEntry<
    T extends { personnel_category: { category_name: string } },
>({ personnel_category, ...rest }: T) {
    return {
        ...rest,
        personnel_category: personnel_category.category_name,
    };
}

export async function listStaffDirectory(query: ListStaffDirectoryQuery = {}) {
    const tokens = (query.q ?? "").split(/\s+/).filter(Boolean);

    const where: Prisma.EmployeeWhereInput = {
        record_status: "Active",
        ...(query.category
            ? {
                  personnel_category: {
                      category_name: { equals: query.category, mode: "insensitive" as const },
                  },
              }
            : {}),
        AND: tokens.map((token) => ({
            OR: [
                { emp_number: { contains: token, mode: "insensitive" as const } },
                { f_name: { contains: token, mode: "insensitive" as const } },
                { m_name: { contains: token, mode: "insensitive" as const } },
                { l_name: { contains: token, mode: "insensitive" as const } },
            ],
        })),
    };

    const employees = await prisma.employee.findMany({
        where,
        orderBy: [{ l_name: "asc" }, { f_name: "asc" }],
        select: staffDirectorySelect,
    });

    return employees.map(toStaffDirectoryEntry);
}