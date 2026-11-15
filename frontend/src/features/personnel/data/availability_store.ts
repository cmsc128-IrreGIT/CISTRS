import { create_preview_store } from "../../../shared/data/create_preview_store";

export const availability_store = create_preview_store([]);
export const availability_statuses = ["Available", "Unavailable", "Not recorded"] as const;
export type AvailabilityStatus = (typeof availability_statuses)[number];

export type AvailabilityValues = {
    personnel: string;
    personnel_name: string;
    date: string;
    status: AvailabilityStatus;
    notes: string;
};

export function record_availability(values: AvailabilityValues) {
    const existing = availability_store.get_snapshot().find(
        (row) => row.personnel === values.personnel && row.date === values.date,
    );
    availability_store.save({ ...values, updated_at: new Date().toISOString() }, existing?.id);
}
