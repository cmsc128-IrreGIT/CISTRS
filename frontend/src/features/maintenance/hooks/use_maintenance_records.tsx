import { useEffect, useState } from "react";
import { maintenance_service } from "../services/maintenance_service";
import type { MaintenanceAdRecord, MaintenanceCpcpTask } from "../types/maintenance_types";

export default function useMaintenanceRecords(enabled = true) {
    const [records, set_records] = useState<{ ads: MaintenanceAdRecord[]; tasks: MaintenanceCpcpTask[] }>({ ads: [], tasks: [] });
    const [loading, set_loading] = useState(true);
    const [error, set_error] = useState("");
    const [version, set_version] = useState(0);
    useEffect(() => {
        let active = true;
        if (!enabled) { set_records({ ads: [], tasks: [] }); set_loading(false); set_error(""); return; }
        set_loading(true);
        set_error("");
        Promise.all([maintenance_service.list_ad_records(), maintenance_service.list_cpcp_tasks()])
            .then(([ads, tasks]) => { if (active) set_records({ ads, tasks }); })
            .catch((cause: unknown) => { if (active) set_error(cause instanceof Error ? cause.message : "Could not load maintenance."); })
            .finally(() => { if (active) set_loading(false); });
        return () => { active = false; };
    }, [version, enabled]);
    return { ...records, loading, error, reload: () => set_version((value) => value + 1) };
}