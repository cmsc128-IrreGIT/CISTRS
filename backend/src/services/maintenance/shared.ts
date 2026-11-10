import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpError.js";
import { prisma } from "../../lib/prisma.js";

// =============================================================================
// Maintenance: shared building blocks (no routes, no business flows)
//   Used by ad-records, cpcp-tasks and aircraft-summary. This file imports
//   from none of them.
//
// The schema's MAINTENANCE section has two record types, both tied to ONE
// aircraft and ONE employee:
//   ad_record  : Airworthiness Directive compliance (signed off by a mechanic)
//   cpcp_task  : Corrosion Prevention and Control Program task (assigned)
// There is no link from a maintenance record to a part, so records belong to
// aircraft only.
// =============================================================================

// -----------------------------------------------------------------------------
// Field rules

// Required, non-blank text with a length cap.
export const textField = (label: string, max: number) =>
    z
        .string(`${label} must be text`)
        .trim()
        .min(1, `${label} is required`)
        .max(max, `${label} must be at most ${max} characters`);

// Calendar date as "YYYY-MM-DD". Impossible dates (2026-02-30) are rejected.
export const dateField = (label: string) =>
    z.iso.date(`${label} must be a valid date (YYYY-MM-DD)`);

// DECIMAL(10,2): at most 8 digits before the point and 2 after, never negative.
export const hoursField = (label: string) =>
    z
        .number(`${label} must be a number`)
        .min(0, `${label} cannot be negative`)
        .max(99_999_999.99, `${label} is too large`)
        .refine(
            (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
            `${label} can have at most 2 decimal places`,
        );

export const uuidField = (label: string) =>
    z.string(`${label} must be text`).uuid(`${label} must be a valid UUID`);

export const urlField = (label: string) =>
    z
        .url({
            protocol: /^https?$/,
            message: `${label} must be an http(s) URL`,
        })
        .max(500, `${label} must be at most 500 characters`);

// Query shape shared by the list endpoints.
export const listQuerySchema = z.object({
    aircraft_UUID: uuidField("aircraft_UUID").optional(),
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
export type ListQuery = z.infer<typeof listQuerySchema>;

// -----------------------------------------------------------------------------
// Dates

export function todayUtc(): string {
    return new Date().toISOString().slice(0, 10);
}

// "YYYY-MM-DD" -> the Date Prisma stores in a DATE column (UTC midnight).
export function toDbDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
}

export function fromDbDate(value: Date | null): string | null {
    return value ? value.toISOString().slice(0, 10) : null;
}

// For update input: undefined = leave alone, null = clear, string = set.
export function dateData(value: string | null | undefined) {
    if (value === undefined) return undefined;
    return value === null ? null : toDbDate(value);
}

// -----------------------------------------------------------------------------
// Cross-field rules

export interface RuleIssue {
    field: string;
    message: string;
}

// Rejects with a 400 in the same { field, message } shape as schema errors.
export function throwIfIssues(issues: RuleIssue[]) {
    if (issues.length > 0) {
        throw new HttpError(400, "Validation failed", issues);
    }
}

// -----------------------------------------------------------------------------
// Related records

// What every maintenance response says about the aircraft: enough to see at a
// glance whether the aircraft is available, without a second request.
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

// A record can only be assigned to / signed off by an existing, active employee.
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

// -----------------------------------------------------------------------------
// Condition / availability information

// Turns due dates and hours into what a reader needs to know:
//   overdue          true when the due date has passed or the aircraft has
//                    flown past the due hours (due exactly today / at exactly
//                    the due hours is "due", not "overdue")
//   days_until_due   negative when past; null when no due date is recorded
//   hours_until_due  negative when past; null when no due hours are recorded
//   due_status       "Overdue" | "Current" | "Not Scheduled"
// Nothing here changes the aircraft's status: it only reports.
export function dueInfo(
    currentHours: number,
    dueDate: string | null,
    dueHours: number | null,
) {
    const days =
        dueDate === null
            ? null
            : Math.round((Date.parse(dueDate) - Date.parse(todayUtc())) / 86_400_000);
    const hours =
        dueHours === null ? null : Math.round((dueHours - currentHours) * 100) / 100;

    const overdue = (days !== null && days < 0) || (hours !== null && hours < 0);
    const scheduled = dueDate !== null || dueHours !== null;

    return {
        due_status: overdue ? "Overdue" : scheduled ? "Current" : "Not Scheduled",
        overdue,
        days_until_due: days,
        hours_until_due: hours,
    };
}
