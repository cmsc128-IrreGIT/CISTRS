import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { HttpError } from "../lib/httpError.js";
import { prisma } from "../lib/prisma.js";

// =============================================================================
// Aircraft status service
//   Shared      : field rules, response mapper
//   BE-12       : record an aircraft's status
//   BE-13       : retrieve status (all aircraft, one aircraft, allowed values)
//   BE-14       : update an aircraft's status
//
// "Status information" for an aircraft is its status (Airworthy, In Maintenance,
// AOG, ...) plus its current flight hours. Both live on the aircraft row, and
// aircraft.aircraft_status_UUID is NOT NULL, so every aircraft always has a status.
// =============================================================================

// -----------------------------------------------------------------------------
// SHARED

// aircraft.current_hours is DECIMAL(10,2): at most 8 digits before the point and 2 after.
const hoursField = z
    .number("Current hours must be a number")
    .min(0, "Current hours cannot be negative")
    .max(99_999_999.99, "Current hours is too large")
    .refine(
        (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
        "Current hours can have at most 2 decimal places",
    );

const statusField = z.string().uuid("aircraft_status_UUID must be a valid UUID");

const aircraftInclude = {
    status: true,
    type: true,
} satisfies Prisma.AircraftInclude;

type AircraftWithRelations = Prisma.AircraftGetPayload<{
    include: typeof aircraftInclude;
}>;

// One mapper for list, detail, record and update, so every endpoint returns the same shape.
function toStatusResponse(aircraft: AircraftWithRelations) {
    return {
        aircraft_UUID: aircraft.aircraft_UUID,
        registration: aircraft.registration,
        aircraft_type: {
            aircraft_type_UUID: aircraft.type.aircraft_type_UUID,
            type_name: aircraft.type.type_name,
        },
        status: {
            aircraft_status_UUID: aircraft.status.aircraft_status_UUID,
            status_name: aircraft.status.status_name,
            description: aircraft.status.description,
        },
        // Prisma returns Decimal objects; the API sends plain numbers.
        current_hours: aircraft.current_hours.toNumber(),
        hours_updated_at: aircraft.hours_updated_at,
    };
}

async function findAircraftOr404(aircraft_UUID: string) {
    const aircraft = await prisma.aircraft.findUnique({
        where: { aircraft_UUID },
        include: aircraftInclude,
    });
    if (!aircraft) throw new HttpError(404, "Aircraft not found");
    return aircraft;
}

async function assertStatusExists(aircraft_status_UUID: string) {
    const status = await prisma.aircraftStatus.findUnique({
        where: { aircraft_status_UUID },
        select: { aircraft_status_UUID: true },
    });
    if (!status) throw new HttpError(404, "Aircraft status not found");
}

// -----------------------------------------------------------------------------
// BE-13: RETRIEVE
//   GET /api/aircraft/statuses                  (allowed status values)
//   GET /api/aircraft                           (every aircraft with its status)
//   GET /api/aircraft/:aircraft_UUID/status     (one aircraft)

export async function listAircraftStatuses() {
    return prisma.aircraftStatus.findMany({
        orderBy: { status_name: "asc" },
        select: {
            aircraft_status_UUID: true,
            status_name: true,
            description: true,
        },
    });
}

export async function listAircraftWithStatus() {
    const aircraft = await prisma.aircraft.findMany({
        orderBy: { registration: "asc" },
        include: aircraftInclude,
    });
    return aircraft.map(toStatusResponse);
}

// A nonexistent aircraft ID gives a 404, not a crash.
export async function getAircraftStatus(aircraft_UUID: string) {
    return toStatusResponse(await findAircraftOr404(aircraft_UUID));
}

// -----------------------------------------------------------------------------
// BE-12: RECORD
//   POST /api/aircraft/:aircraft_UUID/status
//   The status is required. Hours are optional; when sent, hours_updated_at is refreshed.

export const recordAircraftStatusSchema = z
    .object({
        aircraft_status_UUID: statusField,
        current_hours: hoursField.optional(),
    })
    .strict();
export type RecordAircraftStatusInput = z.infer<
    typeof recordAircraftStatusSchema
>;

export async function recordAircraftStatus(
    aircraft_UUID: string,
    input: RecordAircraftStatusInput,
) {
    await findAircraftOr404(aircraft_UUID);
    await assertStatusExists(input.aircraft_status_UUID);

    const updated = await prisma.aircraft.update({
        where: { aircraft_UUID },
        data: {
            aircraft_status_UUID: input.aircraft_status_UUID,
            ...(input.current_hours !== undefined
                ? { current_hours: input.current_hours, hours_updated_at: new Date() }
                : {}),
        },
        include: aircraftInclude,
    });
    return toStatusResponse(updated);
}

// -----------------------------------------------------------------------------
// BE-14: UPDATE
//   PATCH /api/aircraft/:aircraft_UUID/status
//   Any subset of { aircraft_status_UUID, current_hours }. Unsent fields stay as they are.

export const updateAircraftStatusSchema = z
    .object({
        aircraft_status_UUID: statusField,
        current_hours: hoursField,
    })
    .partial()
    .strict()
    .refine(
        (data) => Object.keys(data).length > 0,
        "Provide at least one field to update",
    );
export type UpdateAircraftStatusInput = z.infer<
    typeof updateAircraftStatusSchema
>;

export async function updateAircraftStatus(
    aircraft_UUID: string,
    input: UpdateAircraftStatusInput,
) {
    await findAircraftOr404(aircraft_UUID);
    if (input.aircraft_status_UUID) {
        await assertStatusExists(input.aircraft_status_UUID);
    }

    const updated = await prisma.aircraft.update({
        where: { aircraft_UUID },
        data: {
            ...(input.aircraft_status_UUID
                ? { aircraft_status_UUID: input.aircraft_status_UUID }
                : {}),
            ...(input.current_hours !== undefined
                ? { current_hours: input.current_hours, hours_updated_at: new Date() }
                : {}),
        },
        include: aircraftInclude,
    });
    return toStatusResponse(updated);
}