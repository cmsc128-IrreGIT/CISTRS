import type { PreviewRecord } from "../../../shared/types/record_types";
import { aircraft_status_history, aircraft_store } from "../data/aircraft_store";

// The fleet and status history use preview data until the backend exposes aircraft routes.
export const aircraft_service = {
    list: aircraft_store.get_snapshot,
    subscribe: aircraft_store.subscribe,
    list_status_history: aircraft_status_history.get_snapshot,
    subscribe_to_status_history: aircraft_status_history.subscribe,

    update_status(aircraft_id: string | undefined, values: Omit<PreviewRecord, "id">) {
        const aircraft = aircraft_store.get_snapshot().find(({ id }) => id === aircraft_id);
        if (!aircraft) throw new Error("Aircraft not found.");

        aircraft_status_history.save({
            ...values,
            aircraft_id: aircraft.id,
            previous_status: aircraft.status,
        });
        return aircraft_store.save({ ...aircraft, ...values }, aircraft.id);
    },
};
