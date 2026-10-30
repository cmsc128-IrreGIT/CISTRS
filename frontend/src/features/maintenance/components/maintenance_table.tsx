import { Link } from "react-router";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import StatusBadge from "../../../shared/components/ui/status_badge";
import type { PreviewRecord } from "../../../shared/types/record_types";
const columns: TableColumn<PreviewRecord>[] = [
    {
        id: "task",
        header: "Task",
        render: (row) => (
            <Link
                to={`/maintenance/${row.id}`}
                className="inline-flex min-h-11 items-center rounded font-medium text-[#1d4ed8] underline focus-visible:outline-2"
            >
                {row.title || "Untitled maintenance record"}
            </Link>
        ),
    },
    {
        id: "aircraft",
        header: "Aircraft",
        render: (row) => row.aircraft || "Not recorded",
    },
    {
        id: "date",
        header: "Due date",
        render: (row) =>
            row.due_date ? (
                <time dateTime={row.due_date}>{row.due_date}</time>
            ) : (
                "Not recorded"
            ),
    },
    {
        id: "status",
        header: "Status",
        render: (row) => (
            <StatusBadge
                tone={
                    row.status === "Completed"
                        ? "success"
                        : row.status === "In Progress"
                          ? "info"
                          : row.status === "Scheduled"
                            ? "warning"
                            : "neutral"
                }
            >
                {row.status || "Status unavailable"}
            </StatusBadge>
        ),
    },
    {
        id: "part",
        header: "Related part",
        render: (row) => row.part_number || "No part recorded",
    },
];
export default function MaintenanceTable({
    rows,
    caption = "Maintenance records",
}: {
    rows: PreviewRecord[];
    caption?: string;
}) {
    return (
        <DataTable
            bounded
            compact_empty
            caption={caption}
            rows={rows}
            columns={columns}
            get_row_key={(row) => row.id}
            empty_title="No related maintenance records"
            empty_description="No maintenance information is recorded for this selection."
        />
    );
}
