// import type { LogbookCondition, LogbookEntry } from "../types/logbook_types";
import type { LogbookEmployee, LogbookEntry } from "../types/logbook_types";

const entry_date_format = new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});
// const short_date_format = new Intl.DateTimeFormat("en-GB", {
//     day: "numeric", month: "short", timeZone: "UTC",
// });
// const time_format = new Intl.DateTimeFormat("en-GB", {
//     hour: "2-digit", minute: "2-digit", timeZone: "UTC", hourCycle: "h23",
// });
// const hours_format = new Intl.NumberFormat("en-GB", {
//     minimumFractionDigits: 1, maximumFractionDigits: 3,
// });

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

export function employee_name(employee?: LogbookEmployee | null) {
    return employee ? `${employee.f_name} ${employee.l_name}`.trim() : "Not recorded";
}

// export function entry_updated_at(timestamp?: string) {
//     if (!timestamp) return "Not recorded";
//     const value = new Date(timestamp);
//     return Number.isNaN(value.getTime()) ? "Not recorded" :
//         `${entry_date_format.format(value)}, ${time_format.format(value)}`;
// }

// export function entry_aircraft_hours(hours: string) {
//     const value = Number(hours);
//     return hours.trim() && Number.isFinite(value) ? `${hours_format.format(value)} h` : "Not recorded";
// }

// export function logbook_condition(entry: Pick<LogbookEntry, "recorded_condition" | "defects">): LogbookCondition {
//     return entry.recorded_condition ?? (has_reported_defect(entry.defects) ? "Defect reported" : "No defect reported");
// }

// function has_reported_defect(remarks: string) {
//     return Boolean(remarks.trim()) &&
//         !/^(?:none|nil|no (?:observed )?defects?(?: (?:reported|observed|noted))?)[.!]?$/i.test(remarks.trim());
// }
