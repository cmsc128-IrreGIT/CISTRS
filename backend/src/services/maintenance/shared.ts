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

import { z } from "zod";
import {
    decimalField,
    pagingFields,
    todayUtc,
    uuidField,
} from "../common/fields.js";

// The generic field rules, date helpers and lookups now live in ../common and
// are re-exported here so the maintenance services import from one place.
export {
    dateData,
    dateField,
    fromDbDate,
    textField,
    throwIfIssues,
    todayUtc,
    toDbDate,
    uuidField,
    type RuleIssue,
} from "../common/fields.js";
export {
    aircraftSummarySelect,
    assertActiveEmployee,
    employeeSummarySelect,
    findAircraftOr404,
    toAircraftSummary,
    type AircraftSummaryRow,
} from "../common/lookups.js";

// -----------------------------------------------------------------------------
// Field rules

// Hours are DECIMAL(10,2): see decimalField in ../common/fields.ts.
export const hoursField = (label: string) => decimalField(label);

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
    ...pagingFields,
});
export type ListQuery = z.infer<typeof listQuerySchema>;

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
