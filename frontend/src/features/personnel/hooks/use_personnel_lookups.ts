import { useEffect, useState } from "react";
import { get_personnel_lookups } from "../services/personnel_service";
import type { PersonnelLookups } from "../types/personnel_types";

export default function usePersonnelLookups() {
    const [attempt, set_attempt] = useState(0);
    const [result, set_result] = useState<{
        attempt: number;
        data?: PersonnelLookups;
        error?: string;
    }>();
    useEffect(() => {
        let active = true;
        get_personnel_lookups()
            .then((data) => {
                if (active) set_result({ attempt, data });
            })
            .catch((cause: unknown) => {
                if (active)
                    set_result({
                        attempt,
                        error:
                            cause instanceof Error
                                ? cause.message
                                : "Could not load personnel options.",
                    });
            });
        return () => {
            active = false;
        };
    }, [attempt]);
    const current = result?.attempt === attempt ? result : undefined;
    return {
        data: current?.data,
        loading: !current,
        error: current?.error,
        reload: () => set_attempt((value) => value + 1),
    };
}
