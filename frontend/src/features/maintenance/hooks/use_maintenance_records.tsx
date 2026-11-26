import { useEffect, useMemo, useState } from "react";
import { maintenance_service } from "../services/maintenance_service";
import type {
    MaintenanceAdRecord,
    MaintenanceCpcpTask,
} from "../types/maintenance_types";

type Records = { ads: MaintenanceAdRecord[]; tasks: MaintenanceCpcpTask[] };
const empty_records: Records = { ads: [], tasks: [] };

export default function useMaintenanceRecords(enabled = true) {
    const [version, set_version] = useState(0);
    const scope = useMemo(() => ({ enabled }), [enabled]);
    const [result, set_result] = useState<{
        scope: typeof scope;
        version: number;
        records: Records;
        error: string;
    } | null>(null);

    useEffect(() => {
        if (!scope.enabled) return;
        let active = true;
        Promise.all([
            maintenance_service.list_ad_records(),
            maintenance_service.list_cpcp_tasks(),
        ])
            .then(([ads, tasks]) => {
                if (active)
                    set_result({
                        scope,
                        version,
                        records: { ads, tasks },
                        error: "",
                    });
            })
            .catch((cause: unknown) => {
                if (!active) return;
                const error =
                    cause instanceof Error
                        ? cause.message
                        : "Could not load maintenance.";
                set_result((previous) => ({
                    scope,
                    version,
                    records:
                        previous?.scope === scope
                            ? previous.records
                            : empty_records,
                    error,
                }));
            });
        return () => {
            active = false;
        };
    }, [scope, version]);

    const current = result?.scope === scope ? result : null;
    const loading = enabled && current?.version !== version;
    return {
        ...(current?.records ?? empty_records),
        loading,
        error: loading ? "" : (current?.error ?? ""),
        reload: () => set_version((value) => value + 1),
    };
}
