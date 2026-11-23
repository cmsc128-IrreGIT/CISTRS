import { useEffect, useState } from "react";
import { list_personnel } from "../services/personnel_service";
import type { PersonnelRecord } from "../types/personnel_types";

export default function usePersonnel(enabled = true) {
    const [version, set_version] = useState(0);
    const [result, set_result] = useState<{ version: number; records: PersonnelRecord[]; error: string }>();

    useEffect(() => {
        if (!enabled) return;
        const controller = new AbortController();
        list_personnel(controller.signal)
            .then((records) => {
                if (!controller.signal.aborted) set_result({ version, records, error: "" });
            })
            .catch((cause: unknown) => {
                if (!controller.signal.aborted) set_result({ version, records: [], error: cause instanceof Error ? cause.message : "Could not load personnel." });
            });
        return () => controller.abort();
    }, [enabled, version]);

    const current = enabled && result?.version === version ? result : undefined;
    return {
        records: current?.records ?? [],
        loading: enabled && !current,
        error: current?.error ?? "",
        reload: () => set_version((value) => value + 1),
    };
}
