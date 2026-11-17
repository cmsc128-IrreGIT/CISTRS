import { availability_store } from "../data/availability_store";
import type { AvailabilityValues } from "../types/availability_types";

// The preview register stores one record per employee and date.
export const availability_service = {
    list: availability_store.get_snapshot,
    subscribe: availability_store.subscribe,

    save(values: AvailabilityValues) {
        const existing = availability_store.get_snapshot().find(
            (row) => row.personnel === values.personnel && row.date === values.date,
        );
        return availability_store.save({ ...values, updated_at: new Date().toISOString() }, existing?.id);
    },
};
