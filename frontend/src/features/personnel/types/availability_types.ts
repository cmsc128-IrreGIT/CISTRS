export const availability_statuses = [
    "Available",
    "Unavailable",
    "Not recorded",
] as const;
export type AvailabilityStatus = (typeof availability_statuses)[number];

export type AvailabilityValues = {
    personnel: string;
    personnel_name: string;
    date: string;
    status: AvailabilityStatus;
    notes: string;
};
