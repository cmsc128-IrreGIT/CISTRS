import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { ApiError } from "../../../shared/api/client";
import useAvailability from "./use_availability";
import { list_personnel, list_staff_directory } from "../services/personnel_service";
import type { PersonnelFormValues, PersonnelRecord } from "../types/personnel_types";
import { latest_availability } from "../utils/personnel_records";

const preview_by_account = new Map<string, Map<string, PersonnelFormValues>>();

export function usePersonnelRecords(account_id: string, enabled = true, full_access = true) {
    const [records, set_records] = useState<PersonnelRecord[]>();
    const [error, set_error] = useState<Error>();
    const [attempt, set_attempt] = useState(0);
    const [previews, set_previews] = useState(() => preview_by_account.get(account_id) ?? new Map<string, PersonnelFormValues>());
    const availability = useAvailability();

    useEffect(() => {
        if (!enabled) return;
        const controller = new AbortController();
        (full_access ? list_personnel : list_staff_directory)(controller.signal)
            .then((response) => {
                if (!controller.signal.aborted) set_records(response);
            })
            .catch((cause: unknown) => {
                if (!controller.signal.aborted) {
                    set_error(cause instanceof Error ? cause : new Error("Unable to load personnel."));
                }
            });
        return () => controller.abort();
    }, [account_id, attempt, enabled, full_access]);

    const rows = (records ?? []).map((row) => {
        const preview = full_access ? previews.get(row.id) : undefined;
        return preview ? { ...row, ...preview, preview: true } : row;
    });
    for (const [id, preview] of previews) {
        if (full_access && id.startsWith("preview-")) {
            rows.push({ ...preview, id, category: "", base: "", record_status: "", licenses: [], preview: true });
        }
    }

    function save(values: PersonnelFormValues, id = `preview-${crypto.randomUUID()}`) {
        if (!full_access) throw new Error("Staff directory is read-only.");
        if (rows.some((row) => row.id !== id && row.employee_number.trim().toLowerCase() === values.employee_number.toLowerCase())) {
            throw new Error("This employee ID is already in use.");
        }
        const next = new Map(previews).set(id, values);
        preview_by_account.set(account_id, next);
        set_previews(next);
        return id;
    }

    return {
        rows, availability: latest_availability(availability.records), save, error,
        loading: enabled && !records && !error,
        denied: error instanceof ApiError && error.status === 403,
        reload: () => { set_error(undefined); set_attempt((value) => value + 1); },
    };
}

export type PersonnelDirectoryContext = ReturnType<typeof usePersonnelRecords> & {
    can_manage: boolean;
    full_access: boolean;
    can_view_availability: boolean;
};

export function usePersonnelDirectory() {
    return useOutletContext<PersonnelDirectoryContext>();
}
