import { prisma } from "../lib/prisma.js";
import { listAircraftStatuses } from "./aircraft.service.js";
import { listPositions } from "./user.service.js";

// =============================================================================
// Lookups: every dropdown list the forms need, in one call
//   GET /api/lookups
//   Only Base and Position carry an active flag, so only they are filtered.
//   Every list is sorted by name.
// =============================================================================

export async function listLookups() {
    const [
        flight_types,
        flight_statuses,
        delay_categories,
        bases,
        employment_statuses,
        personnel_categories,
        positions,
        aircraft_types,
        aircraft_statuses,
    ] = await Promise.all([
        prisma.flightType.findMany({
            orderBy: { type_name: "asc" },
            select: { flight_type_UUID: true, type_name: true, description: true },
        }),
        prisma.flightStatus.findMany({
            orderBy: { status_name: "asc" },
            select: { flight_status_UUID: true, status_name: true, description: true },
        }),
        prisma.delayCategory.findMany({
            orderBy: { category_name: "asc" },
            select: { delay_category_UUID: true, category_name: true, description: true },
        }),
        prisma.base.findMany({
            where: { base_status: "Active" },
            orderBy: { base_name: "asc" },
            select: { base_UUID: true, base_name: true, base_location: true },
        }),
        prisma.employmentStatus.findMany({
            orderBy: { status_name: "asc" },
            select: { emp_status_UUID: true, status_name: true, description: true },
        }),
        prisma.personnelCategory.findMany({
            orderBy: { category_name: "asc" },
            select: { personnel_category_UUID: true, category_name: true, description: true },
        }),
        listPositions(),
        prisma.aircraftType.findMany({
            orderBy: { type_name: "asc" },
            select: { aircraft_type_UUID: true, type_name: true, description: true },
        }),
        listAircraftStatuses(),
    ]);

    return {
        flight_types,
        flight_statuses,
        delay_categories,
        bases,
        employment_statuses,
        personnel_categories,
        positions,
        aircraft_types,
        aircraft_statuses,
    };
}