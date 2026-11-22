import type { PreviewRecord } from "../../../shared/types/record_types";
import { maintenance_store } from "../data/maintenance_store";

// Tasks and work records share a preview list while their API contracts are pending.
export const maintenance_service = {
    list: maintenance_store.get_snapshot,
    subscribe: maintenance_store.subscribe,
    save_task: maintenance_store.save,

    add_work_record(values: Omit<PreviewRecord, "id">, recorded_by = "") {
        return maintenance_store.save({ ...values, recorded_by });
    },
};
