import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { ApiError } from "../../../shared/api/client";
import useAvailability from "./use_availability";
import {
    create_personnel,
    update_personnel,
    list_personnel,
    list_staff_directory,
} from "../services/personnel_service";
import type { PersonnelInput, PersonnelRecord } from "../types/personnel_types";
import { latest_availability } from "../utils/personnel_records";

export function usePersonnelRecords(
    account_id: string,
    enabled = true,
    full_access = true,
) {
    const [records, set_records] = useState<PersonnelRecord[]>();
    const [error, set_error] = useState<Error>();
    const [attempt, set_attempt] = useState(0);
    const availability = useAvailability(full_access);

    useEffect(() => {
        if (!enabled) return;
        const controller = new AbortController();
        (full_access ? list_personnel : list_staff_directory)(controller.signal)
            .then((response) => {
                if (!controller.signal.aborted) set_records(response);
            })
            .catch((cause: unknown) => {
                if (!controller.signal.aborted) {
                    set_error(
                        cause instanceof Error
                            ? cause
                            : new Error("Unable to load personnel."),
                    );
                }
            });
        return () => controller.abort();
    }, [account_id, attempt, enabled, full_access]);

    const rows = records ?? [];

    async function save(values: PersonnelInput, id?: string) {
        if (!full_access) throw new Error("Staff directory is read-only.");
        if (
            rows.some(
                (row) =>
                    row.id !== id &&
                    row.employee_number.trim().toLowerCase() ===
                        values.emp_number.toLowerCase(),
            )
        ) {
            throw new Error("This employee ID is already in use.");
        }
        const current = rows.find((row) => row.id === id)?.employee;
        const changes = Object.fromEntries(
            Object.entries(values).filter(
                ([key, value]) =>
                    value !== (current?.[key as keyof PersonnelInput] ?? null),
            ),
        ) as Partial<PersonnelInput>;
        if (id && !Object.keys(changes).length) return id;
        const saved = id
            ? await update_personnel(id, changes)
            : await create_personnel(values);
        set_records((previous) =>
            [
                ...(previous ?? []).filter((row) => row.id !== saved.id),
                saved,
            ].sort((first, second) =>
                first.employee_number.localeCompare(second.employee_number),
            ),
        );
        return saved.id;
    }

    return {
        rows,
        availability: latest_availability(availability.records),
        save,
        error,
        loading: enabled && !records && !error,
        denied: error instanceof ApiError && error.status === 403,
        reload: () => {
            set_error(undefined);
            set_attempt((value) => value + 1);
        },
    };
}

export type PersonnelDirectoryContext = ReturnType<
    typeof usePersonnelRecords
> & {
    can_manage: boolean;
    full_access: boolean;
    can_view_availability: boolean;
};

export function usePersonnelDirectory() {
    return useOutletContext<PersonnelDirectoryContext>();
}
