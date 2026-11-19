import { useEffect, useState } from "react";
import { aircraft_service } from "../services/aircraft_service";
import type { AircraftStatusOption } from "../types/aircraft_types";

export default function useAircraftStatuses() {
    const [statuses, set_statuses] = useState<AircraftStatusOption[]>([]);
    const [is_loading, set_is_loading] = useState(true);
    const [error, set_error] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        aircraft_service
            .list_statuses()
            .then((data) => {
                if (!active) return;
                set_statuses(data);
                set_error(null);
            })
            .catch((cause: unknown) => {
                if (!active) return;
                set_error(
                    cause instanceof Error
                        ? cause.message
                        : "Failed to load aircraft statuses.",
                );
            })
            .finally(() => {
                if (active) set_is_loading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    return { statuses, is_loading, error };
}
