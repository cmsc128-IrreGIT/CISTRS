import { useEffect, useState, useSyncExternalStore } from "react";
import { useOutletContext } from "react-router";
import { ApiError } from "../../../shared/api/client";
import { availability_store } from "../data/availability_store";
import { list_personnel } from "../services/personnel_service";
import type { PersonnelFormValues, PersonnelRecord } from "../types/personnel_types";
import { latest_availability } from "../utils/personnel_records";

const preview_by_account = new Map<string, Map<string, PersonnelFormValues>>();

export function usePersonnelRecords(account_id: string, enabled = true) {
    const [records, set_records] = useState<PersonnelRecord[]>();
    const [error, set_error] = useState<Error>();
    const [attempt, set_attempt] = useState(0);
    const [previews, set_previews] = useState(() => preview_by_account.get(account_id) ?? new Map<string, PersonnelFormValues>());
    const availability = useSyncExternalStore(availability_store.subscribe, availability_store.get_snapshot);

    useEffect(() => {
        if (!enabled) return;
        const controller = new AbortController();
        list_personnel(controller.signal)
            .then((response) => {
                if (!controller.signal.aborted) set_records(response);
            })
            .catch((cause: unknown) => {
                if (!controller.signal.aborted) {
                    set_error(cause instanceof Error ? cause : new Error("Unable to load personnel."));
                }
            });
        return () => controller.abort();
    }, [account_id, attempt, enabled]);

    const rows = (records ?? []).map((row) => {
        const preview = previews.get(row.id);
        return preview ? { ...row, ...preview, preview: true } : row;
    });
    for (const [id, preview] of previews) {
        if (id.startsWith("preview-")) {
            rows.push({ ...preview, id, category: "", base: "", record_status: "", licenses: [], preview: true });
        }
    }

    function save(values: PersonnelFormValues, id = `preview-${crypto.randomUUID()}`) {
        if (rows.some((row) => row.id !== id && row.employee_number.trim().toLowerCase() === values.employee_number.toLowerCase())) {
            throw new Error("This employee ID is already in use.");
        }
        const next = new Map(previews).set(id, values);
        preview_by_account.set(account_id, next);
        set_previews(next);
        return id;
    }

    return {
        rows, availability: latest_availability(availability), save, error,
        loading: enabled && !records && !error,
        denied: error instanceof ApiError && error.status === 403,
        reload: () => { set_error(undefined); set_attempt((value) => value + 1); },
    };
}

export type PersonnelDirectoryContext = ReturnType<typeof usePersonnelRecords> & { can_manage: boolean };

export function usePersonnelDirectory() {
    return useOutletContext<PersonnelDirectoryContext>();
}
