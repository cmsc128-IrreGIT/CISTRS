import { logbook_store } from "../data/logbook_store";

// The technical logbook uses preview entries while its API contract is pending.
export const logbook_service = {
    list: logbook_store.get_snapshot,
    subscribe: logbook_store.subscribe,
    save_entry: logbook_store.save,
};
