// Event codes. They must match notification_type.event_code in the database.
export const EVENT = {
    PER_LIC_EXPIRING: "PER_LIC_EXPIRING",
    PER_LIC_EXPIRED: "PER_LIC_EXPIRED",
    PER_MED_EXPIRING: "PER_MED_EXPIRING",
    PER_MED_EXPIRED: "PER_MED_EXPIRED",
    PER_TRN_EXPIRING: "PER_TRN_EXPIRING",
    INV_LOW_STOCK: "INV_LOW_STOCK",
    INV_OUT_OF_STOCK: "INV_OUT_OF_STOCK",
    INV_PART_EXPIRING: "INV_PART_EXPIRING",
    MAINT_AD_DUE_DATE: "MAINT_AD_DUE_DATE",
    MAINT_AD_DUE_HOURS: "MAINT_AD_DUE_HOURS",
    MAINT_AD_OVERDUE: "MAINT_AD_OVERDUE",
    MAINT_CPCP_DUE: "MAINT_CPCP_DUE",
    AIRCRAFT_STATUS_CHANGE: "AIRCRAFT_STATUS_CHANGE",
    FLT_QA_PENDING: "FLT_QA_PENDING",
    FUEL_DISCREPANCY: "FUEL_DISCREPANCY",
} as const;

export type Severity = "Info" | "Warning" | "Critical";

// Matches the filter in the notification page. "All features" = no filter.
export const CATEGORIES = [
    "Personnel",
    "Inventory",
    "Aircraft",
    "Maintenance",
    "System",
] as const;

// Today's calendar date in Manila, as a UTC-midnight Date.
// Your @db.Date columns compare equal to this value.
export function todayInManila(): Date {
    const ymd = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
    }).format(new Date()); // "YYYY-MM-DD"
    return new Date(`${ymd}T00:00:00.000Z`);
}

export function addDays(date: Date, days: number): Date {
    const copy = new Date(date.getTime());
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
}

export function isoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export function fullName(employee: { f_name: string; l_name: string }): string {
    return `${employee.f_name} ${employee.l_name}`;
}
