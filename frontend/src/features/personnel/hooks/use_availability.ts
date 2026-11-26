import { useEffect, useState } from "react";
import { availability_service } from "../services/personnel_service";
import type { AvailabilityRecord } from "../../../shared/api/client";

// Extended record with aliases for frontend compatibility
// Compatible with PreviewRecord { id: string; [field: string]: string }
export interface AvailabilityRecordExtended extends Omit<
    AvailabilityRecord,
    "notes"
> {
    id: string; // alias for availability_UUID (for PreviewRecord compatibility)
    personnel: string; // alias for emp_UUID (for dialog compatibility)
    personnel_name: string; // populated by component
    notes: string; // override to be non-null for index signature
    // Index signature for PreviewRecord compatibility - all fields are strings
    [key: string]: string;
}

export default function useAvailability(enabled = true) {
    const [version, set_version] = useState(0);
    const [result, set_result] = useState<{
        version: number;
        records: AvailabilityRecordExtended[];
        error: string | null;
    }>();
    useEffect(() => {
        if (!enabled) return;
        let active = true;
        availability_service
            .list()
            .then((response) => {
                // Convert backend format to frontend format with all fields + aliases
                // Ensure notes is string (not null) for index signature compatibility
                const records = response.items.map((item) => ({
                    ...item,
                    id: item.availability_UUID,
                    personnel: item.emp_UUID,
                    personnel_name: "", // Will be populated by the component
                    notes: item.notes ?? "",
                }));
                if (active) set_result({ version, records, error: null });
            })
            .catch((err: unknown) => {
                if (active)
                    set_result({
                        version,
                        records: [],
                        error:
                            err instanceof Error
                                ? err.message
                                : "Failed to load availability",
                    });
            });
        return () => {
            active = false;
        };
    }, [enabled, version]);
    const current = enabled && result?.version === version ? result : undefined;
    return {
        records: current?.records ?? [],
        loading: enabled && !current,
        error: current?.error ?? null,
        refresh: () => set_version((value) => value + 1),
    };
}
