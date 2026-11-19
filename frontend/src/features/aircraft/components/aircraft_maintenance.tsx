import { useEffect, useState } from "react";
import { Link } from "react-router";
import DataTable from "../../../shared/components/ui/data_table";
import StatusBadge from "../../../shared/components/ui/status_badge";
import Button from "../../../shared/components/ui/button";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import { maintenance_service } from "../../maintenance/services/maintenance_service";
import type { AircraftMaintenance } from "../../maintenance/types/maintenance_types";
import { maintenance_summary } from "../../maintenance/utils/maintenance_summary";

export default function AircraftMaintenanceRecords({ aircraft_id, upcoming = false }: { aircraft_id: string; upcoming?: boolean }) {
    const [data, set_data] = useState<AircraftMaintenance | null>(null);
    const [error, set_error] = useState("");
    const [loading, set_loading] = useState(true);
    const [attempt, set_attempt] = useState(0);
    useEffect(() => {
        let active = true;
        set_loading(true);
        set_error("");
        maintenance_service.get_aircraft_maintenance(aircraft_id)
            .then((result) => { if (active) set_data(result); })
            .catch((cause: unknown) => { if (active) set_error(cause instanceof Error ? cause.message : "Could not load maintenance."); })
            .finally(() => { if (active) set_loading(false); });
        return () => { active = false; };
    }, [aircraft_id, attempt]);
    if (loading) return <ScreenLoading compact label="Loading maintenance..." />;
    if (error) return <div role="alert"><p className="text-sm text-red-700">{error}</p><Button variant="ghost" onClick={() => set_attempt((value) => value + 1)}>Retry</Button></div>;
    const records = [...(data?.ad_records ?? []), ...(data?.cpcp_tasks ?? [])].map(maintenance_summary)
        .filter((record) => !upcoming || record.due_date || record.due_hours !== null)
        .sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.due_date || "9999").localeCompare(b.due_date || "9999"));
    return <DataTable inventory caption={upcoming ? "Next maintenance tasks" : "Aircraft maintenance"} rows={upcoming ? records.slice(0, 3) : records} get_row_key={(record) => record.id}
        empty_title={upcoming ? "No scheduled maintenance" : "No maintenance records"}
        columns={[
            { id: "title", header: "Record", render: (row) => row.title },
            { id: "due", header: "Due date", render: (row) => row.due_date || "Not scheduled" },
            { id: "hours", header: "Due hours", render: (row) => row.due_hours ?? "Not scheduled" },
            { id: "status", header: "Due status", render: (row) => <StatusBadge tone={row.overdue ? "danger" : row.status === "Current" ? "success" : "neutral"}>{row.status}</StatusBadge> },
            { id: "action", header: "Action", render: (row) => <Link to={`/maintenance/${row.id}`} className="inline-flex min-h-8 items-center font-semibold text-link">View</Link> },
        ]} />;
}
