import type { LogbookEmployee, LogbookEntry } from "../types/logbook_types";

export const logbook_primary = "bg-[#0b2238]! hover:bg-[#193951]!";
export const logbook_breadcrumb_title = "Aircraft logbook";

const entry_date_format = new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

export function employee_name(employee?: LogbookEmployee | null) {
    return employee ? `${employee.f_name} ${employee.l_name}`.trim() : "Not recorded";
}

export function entry_reference(entry: Pick<LogbookEntry, "route">) {
    return entry.route.trim() || "No route recorded";
}

export function entry_date(date: string, short = false) {
    const value = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(value.getTime())) return "Not recorded";
    if (!short) return entry_date_format.format(value);
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric", month: "short", timeZone: "UTC",
    }).format(value);
}

export function entry_time(timestamp?: string | null) {
    if (!timestamp) return "Not recorded";
    const value = new Date(timestamp);
    if (Number.isNaN(value.getTime())) return "Not recorded";
    return new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit", minute: "2-digit", timeZone: "UTC", hourCycle: "h23",
    }).format(value);
}
