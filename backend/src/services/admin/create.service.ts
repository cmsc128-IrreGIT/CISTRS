import { z } from "zod";
import { HttpError } from "../../lib/httpError.js";
import { prisma } from "../../lib/prisma.js";

// =============================================================================
// Admin: add new dropdown entries
//   POST /api/admin/flight-statuses
//   POST /api/admin/flight-types
//   POST /api/admin/delay-categories
//   POST /api/admin/personnel-categories
//   POST /api/admin/locations
//   POST /api/admin/manufacturers
//   POST /api/admin/suppliers
//   (POST /api/admin/aircraft lives in aircraft.service.ts: it returns the
//    aircraft status object that module already maps.)
//
//   Mounted behind the "User Accounts" feature (the administration feature).
//   Names are compared case-insensitively, so "weather" cannot be added next to
//   "Weather". The database unique constraints stay as the backstop for races.
//   Create only: no schema or data changes, and no edit or delete here.
// =============================================================================

// -----------------------------------------------------------------------------
// SHARED

function textField(label: string, max = 100) {
    return z
        .string(`${label} must be text`)
        .trim()
        .min(1, `${label} is required`)
        .max(max, `${label} must be at most ${max} characters`);
}

// description is NOT NULL in the database, so leaving it out stores "".
const descriptionField = z
    .string("Description must be text")
    .trim()
    .max(500, "Description must be at most 500 characters")
    .default("");

function ci(value: string) {
    return { equals: value, mode: "insensitive" as const };
}

// -----------------------------------------------------------------------------
// FLIGHT STATUS

export const createFlightStatusSchema = z
    .object({
        status_name: textField("Status name"),
        description: descriptionField,
    })
    .strict();
export type CreateFlightStatusInput = z.infer<typeof createFlightStatusSchema>;

export async function createFlightStatus(input: CreateFlightStatusInput) {
    const taken = await prisma.flightStatus.findFirst({
        where: { status_name: ci(input.status_name) },
        select: { flight_status_UUID: true },
    });
    if (taken) {
        throw new HttpError(409, "A flight status with this name already exists");
    }
    return prisma.flightStatus.create({
        data: input,
        select: {
            flight_status_UUID: true,
            status_name: true,
            description: true,
        },
    });
}

// -----------------------------------------------------------------------------
// FLIGHT TYPE

export const createFlightTypeSchema = z
    .object({
        type_name: textField("Type name"),
        description: descriptionField,
    })
    .strict();
export type CreateFlightTypeInput = z.infer<typeof createFlightTypeSchema>;

export async function createFlightType(input: CreateFlightTypeInput) {
    const taken = await prisma.flightType.findFirst({
        where: { type_name: ci(input.type_name) },
        select: { flight_type_UUID: true },
    });
    if (taken) {
        throw new HttpError(409, "A flight type with this name already exists");
    }
    return prisma.flightType.create({
        data: input,
        select: {
            flight_type_UUID: true,
            type_name: true,
            description: true,
        },
    });
}

// -----------------------------------------------------------------------------
// DELAY CATEGORY

export const createDelayCategorySchema = z
    .object({
        category_name: textField("Category name"),
        description: descriptionField,
    })
    .strict();
export type CreateDelayCategoryInput = z.infer<typeof createDelayCategorySchema>;

export async function createDelayCategory(input: CreateDelayCategoryInput) {
    const taken = await prisma.delayCategory.findFirst({
        where: { category_name: ci(input.category_name) },
        select: { delay_category_UUID: true },
    });
    if (taken) {
        throw new HttpError(409, "A delay category with this name already exists");
    }
    return prisma.delayCategory.create({
        data: input,
        select: {
            delay_category_UUID: true,
            category_name: true,
            description: true,
        },
    });
}

// -----------------------------------------------------------------------------
// PERSONNEL CATEGORY ("category" on the employee form)

export const createPersonnelCategorySchema = z
    .object({
        category_name: textField("Category name"),
        description: descriptionField,
    })
    .strict();
export type CreatePersonnelCategoryInput = z.infer<
    typeof createPersonnelCategorySchema
>;

export async function createPersonnelCategory(
    input: CreatePersonnelCategoryInput,
) {
    const taken = await prisma.personnelCategory.findFirst({
        where: { category_name: ci(input.category_name) },
        select: { personnel_category_UUID: true },
    });
    if (taken) {
        throw new HttpError(
            409,
            "A personnel category with this name already exists",
        );
    }
    return prisma.personnelCategory.create({
        data: input,
        select: {
            personnel_category_UUID: true,
            category_name: true,
            description: true,
        },
    });
}

// -----------------------------------------------------------------------------
// INVENTORY LOCATION
//   A location is a (location_name, storage_area) pair, unique as a pair.

export const createLocationSchema = z
    .object({
        location_name: textField("Location name"),
        storage_area: textField("Storage area"),
    })
    .strict();
export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export async function createLocation(input: CreateLocationInput) {
    const taken = await prisma.inventoryLocation.findFirst({
        where: {
            location_name: ci(input.location_name),
            storage_area: ci(input.storage_area),
        },
        select: { location_UUID: true },
    });
    if (taken) {
        throw new HttpError(
            409,
            "This location and storage area already exist",
        );
    }
    return prisma.inventoryLocation.create({
        data: input,
        select: {
            location_UUID: true,
            location_name: true,
            storage_area: true,
        },
    });
}

// -----------------------------------------------------------------------------
// SUPPLIER and MANUFACTURER
//   Both are roles on an organization, and one organization can hold both
//   (overlapping ISA). So adding a supplier whose organization (same name and
//   location) already exists as a manufacturer attaches the supplier role to
//   that organization instead of creating a duplicate. Adding a role the
//   organization already holds is a 409.

export const createOrganizationSchema = z
    .object({
        organization_name: textField("Organization name", 150),
        organization_location: textField("Organization location", 150),
    })
    .strict();
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

const organizationSelect = {
    organization_UUID: true,
    organization_name: true,
    organization_location: true,
    supplier: { select: { organization_UUID: true } },
    manufacturer: { select: { organization_UUID: true } },
} as const;

function toOrganizationResponse(organization: {
    organization_UUID: string;
    organization_name: string;
    organization_location: string;
    supplier: { organization_UUID: string } | null;
    manufacturer: { organization_UUID: string } | null;
}) {
    return {
        organization_UUID: organization.organization_UUID,
        organization_name: organization.organization_name,
        organization_location: organization.organization_location,
        is_supplier: organization.supplier !== null,
        is_manufacturer: organization.manufacturer !== null,
    };
}

async function addOrganizationRole(
    input: CreateOrganizationInput,
    role: "supplier" | "manufacturer",
) {
    return prisma.$transaction(async (tx) => {
        const existing = await tx.organization.findFirst({
            where: {
                organization_name: ci(input.organization_name),
                organization_location: ci(input.organization_location),
            },
            select: organizationSelect,
        });

        if (existing?.[role]) {
            throw new HttpError(409, `This organization is already a ${role}`);
        }

        const organization_UUID =
            existing?.organization_UUID ??
            (
                await tx.organization.create({
                    data: input,
                    select: { organization_UUID: true },
                })
            ).organization_UUID;

        if (role === "supplier") {
            await tx.supplier.create({ data: { organization_UUID } });
        } else {
            await tx.manufacturer.create({ data: { organization_UUID } });
        }

        return toOrganizationResponse(
            await tx.organization.findUniqueOrThrow({
                where: { organization_UUID },
                select: organizationSelect,
            }),
        );
    });
}

export function createSupplier(input: CreateOrganizationInput) {
    return addOrganizationRole(input, "supplier");
}

export function createManufacturer(input: CreateOrganizationInput) {
    return addOrganizationRole(input, "manufacturer");
}
