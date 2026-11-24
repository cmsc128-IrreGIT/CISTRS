import type { LogbookCondition, LogbookEntry } from "../types/logbook_types";

export const logbook_primary = "bg-[#0b2238]! hover:bg-[#193951]!";
export const logbook_breadcrumb_title = "Aircraft logbook";

const entry_date_format = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
});
const short_date_format = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
});
const time_format = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hourCycle: "h23",
});
const hours_format = new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 3,
});

export function entry_reference(entry: LogbookEntry) {
    return entry.log_page.trim() || "No reference recorded";
}

export function entry_date(date: string, short = false) {
    const value = new Date(`${date}T00:00:00Z`);
    return Number.isNaN(value.getTime())
        ? "Not recorded"
        : (short ? short_date_format : entry_date_format).format(value);
}

export function entry_updated_at(timestamp?: string) {
    if (!timestamp) return "Not recorded";
    const value = new Date(timestamp);
    return Number.isNaN(value.getTime())
        ? "Not recorded"
        : `${entry_date_format.format(value)}, ${time_format.format(value)}`;
}

export function entry_aircraft_hours(hours: string) {
    const value = Number(hours);
    return hours.trim() && Number.isFinite(value)
        ? `${hours_format.format(value)} h`
        : "Not recorded";
}

export function logbook_condition(
    entry: Pick<LogbookEntry, "recorded_condition" | "defects">,
): LogbookCondition {
    return (
        entry.recorded_condition ??
        (has_reported_defect(entry.defects)
            ? "Defect reported"
            : "No defect reported")
    );
}

function has_reported_defect(remarks: string) {
    return (
        Boolean(remarks.trim()) &&
        !/^(?:none|nil|no (?:observed )?defects?(?: (?:reported|observed|noted))?)[.!]?$/i.test(
            remarks.trim(),
        )
    );
}
