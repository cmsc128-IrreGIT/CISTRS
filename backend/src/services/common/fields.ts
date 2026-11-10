import { z } from "zod";
import { HttpError } from "../../lib/httpError.js";

// =============================================================================
// Common field rules, date helpers and cross-field rule plumbing
//   Used by the maintenance and logbook modules. Imports nothing from them.
// =============================================================================

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

// Timestamp with an explicit zone, e.g. 2026-10-15T01:00:00Z or ...+08:00.
export const dateTimeField = (label: string) =>
    z.iso.datetime({
        offset: true,
        error: `${label} must be a valid timestamp with a time zone (e.g. 2026-10-15T01:00:00Z)`,
    });

// Non-negative DECIMAL with at most 2 decimal places and an upper bound
// (DECIMAL(10,2) -> 99_999_999.99, DECIMAL(6,2) -> 9_999.99).
export const decimalField = (label: string, max = 99_999_999.99) =>
    z
        .number(`${label} must be a number`)
        .min(0, `${label} cannot be negative`)
        .max(max, `${label} is too large`)
        .refine(
            (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
            `${label} can have at most 2 decimal places`,
        );

export const uuidField = (label: string) =>
    z.string(`${label} must be text`).uuid(`${label} must be a valid UUID`);

// limit / offset for list endpoints (query-string values arrive as text).
export const pagingFields = {
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
};

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
