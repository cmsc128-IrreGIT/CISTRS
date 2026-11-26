import { useEffect, useState } from "react";
import { Link } from "react-router";
import DataTable from "../../../shared/components/ui/data_table";
import StatusBadge from "../../../shared/components/ui/status_badge";
import Button from "../../../shared/components/ui/button";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import Pagination from "../../../shared/components/ui/pagination";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import { maintenance_service } from "../../maintenance/services/maintenance_service";
import type { AircraftMaintenance } from "../../maintenance/types/maintenance_types";
import { maintenance_summary } from "../../maintenance/utils/maintenance_summary";

export default function AircraftMaintenanceRecords({
    aircraft_id,
    upcoming = false,
}: {
    aircraft_id: string;
    upcoming?: boolean;
}) {
    const [result, set_result] = useState<{
        key: string;
        data?: AircraftMaintenance;
        error?: string;
    } | null>(null);
    const [attempt, set_attempt] = useState(0);
    const key = `${aircraft_id}:${attempt}`;
    const current = result?.key === key ? result : null;
    useEffect(() => {
        let active = true;
        maintenance_service
            .get_aircraft_maintenance(aircraft_id)
            .then((data) => {
                if (active) set_result({ key, data });
            })
            .catch((cause: unknown) => {
                if (active)
                    set_result({
                        key,
                        error:
                            cause instanceof Error
                                ? cause.message
                                : "Could not load maintenance.",
                    });
            });
        return () => {
            active = false;
        };
    }, [aircraft_id, key]);
    const records = [
        ...(current?.data?.ad_records ?? []),
        ...(current?.data?.cpcp_tasks ?? []),
    ]
        .map(maintenance_summary)
        .filter((row) => !upcoming || row.due_date || row.due_hours !== null)
        .sort(
            (a, b) =>
                Number(b.overdue) - Number(a.overdue) ||
                (a.due_date || "9999").localeCompare(b.due_date || "9999"),
        );
    const { visible_rows, footer } = useTablePagination(records, aircraft_id);
    if (!current)
        return <ScreenLoading compact label="Loading maintenance..." />;
    if (current.error)
        return (
            <div role="alert">
                <p className="text-sm text-red-700">{current.error}</p>
                <Button
                    variant="ghost"
                    onClick={() => set_attempt((value) => value + 1)}
                >
                    Retry
                </Button>
            </div>
        );
    return (
        <>
            <DataTable
                inventory
                caption={
                    upcoming
                        ? "Next maintenance tasks"
                        : "Aircraft maintenance records"
                }
                rows={upcoming ? records.slice(0, 3) : visible_rows}
                get_row_key={(row) => row.id}
                empty_title={
                    upcoming
                        ? "No scheduled maintenance"
                        : "No maintenance records"
                }
                columns={[
                    {
                        id: "record",
                        header: "Record",
                        render: (row) => row.title,
                    },
                    {
                        id: "date",
                        header: "Due date",
                        render: (row) => row.due_date || "Not scheduled",
                    },
                    {
                        id: "hours",
                        header: "Due hours",
                        render: (row) => row.due_hours ?? "Not scheduled",
                    },
                    {
                        id: "status",
                        header: "Due status",
                        render: (row) => (
                            <StatusBadge
                                tone={
                                    row.overdue
                                        ? "danger"
                                        : row.status === "Current"
                                          ? "success"
                                          : "neutral"
                                }
                            >
                                {row.status}
                            </StatusBadge>
                        ),
                    },
                    {
                        id: "action",
                        header: "Action",
                        render: (row) => (
                            <Link
                                to={`/maintenance/${row.id}`}
                                className="inline-flex min-h-8 items-center font-medium text-link"
                            >
                                View
                            </Link>
                        ),
                    },
                ]}
            />
            {!upcoming && <Pagination {...footer} item_label="record" />}
        </>
    );
}
