import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpError.js";
import { prisma } from "../../lib/prisma.js";

// =============================================================================
// Common record lookups and response summaries
//   Used by the maintenance and logbook modules. Imports nothing from them.
// =============================================================================

// What responses say about an aircraft: enough to see at a glance whether it
// is available, without a second request.
export const aircraftSummarySelect = {
    aircraft_UUID: true,
    registration: true,
    current_hours: true,
    status: { select: { aircraft_status_UUID: true, status_name: true } },
} satisfies Prisma.AircraftSelect;

export type AircraftSummaryRow = Prisma.AircraftGetPayload<{
    select: typeof aircraftSummarySelect;
}>;

export function toAircraftSummary(aircraft: AircraftSummaryRow) {
    return {
        aircraft_UUID: aircraft.aircraft_UUID,
        registration: aircraft.registration,
        status: aircraft.status.status_name,
        current_hours: aircraft.current_hours.toNumber(),
    };
}

export const employeeSummarySelect = {
    emp_UUID: true,
    emp_number: true,
    f_name: true,
    l_name: true,
} satisfies Prisma.EmployeeSelect;

export async function findAircraftOr404(aircraft_UUID: string) {
    const aircraft = await prisma.aircraft.findUnique({
        where: { aircraft_UUID },
        select: aircraftSummarySelect,
    });
    if (!aircraft) throw new HttpError(404, "Aircraft not found");
    return aircraft;
}

// A record can only name an existing, active employee.
export async function assertActiveEmployee(emp_UUID: string, label: string) {
    const employee = await prisma.employee.findUnique({
        where: { emp_UUID },
        select: { record_status: true },
    });
    if (!employee) throw new HttpError(404, `${label} not found`);
    if (employee.record_status !== "Active") {
        throw new HttpError(400, `${label} is not an active employee`);
    }
}
