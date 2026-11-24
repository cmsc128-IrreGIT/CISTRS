import { Link } from "react-router";
import StatusBadge from "../../../shared/components/ui/status_badge";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import type { LogbookEntry } from "../types/logbook_types";
import {
    entry_date,
    entry_reference,
    logbook_condition,
} from "../utils/logbook_entries";

const columns: TableColumn<LogbookEntry>[] = [
    {
        id: "date",
        header: "Date & time / reference",
        render: (row) => (
            <span className="font-medium">
                <time dateTime={row.entry_date}>
                    {entry_date(row.entry_date, true)}
                    {row.entry_time ? `, ${row.entry_time}` : ""}
                </time>
                {" / "}
                {entry_reference(row)}
            </span>
        ),
    },
    { id: "aircraft", header: "Aircraft", render: (row) => row.aircraft },
    {
        id: "condition",
        header: "Condition",
        render: (row) => {
            const condition = logbook_condition(row);
            return (
                <StatusBadge
                    tone={
                        condition === "Defect reported" ? "danger" : "neutral"
                    }
                >
                    {condition}
                </StatusBadge>
            );
        },
    },
    {
        id: "author",
        header: "Author",
        render: (row) => row.recorded_by || "Not recorded",
    },
    {
        id: "action",
        header: "Action",
        render: (row) => (
            <Link
                to={`/logbook/${row.id}`}
                aria-label={`View entry for ${row.aircraft} on ${row.entry_date}`}
                className="inline-flex min-h-8 items-center whitespace-nowrap font-medium text-link"
            >
                View entry
            </Link>
        ),
    },
];

export default function LogbookTable({
    rows,
    is_filtered,
}: {
    rows: LogbookEntry[];
    is_filtered: boolean;
}) {
    return (
        <DataTable
            inventory
            columns={columns}
            rows={rows}
            get_row_key={(row) => row.id}
            caption="Logbook entries"
            empty_title={
                is_filtered ? "No matching entries" : "No logbook entries yet"
            }
            empty_description={
                is_filtered ? "Try different filters." : undefined
            }
        />
    );
}
