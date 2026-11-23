import { Link } from "react-router";
import LogbookStatusBadge from "./logbook_status_badge";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import type { LogbookEntry } from "../types/logbook_types";
import { employee_name, entry_date, entry_reference, entry_time } from "../utils/logbook_entries";

const columns: TableColumn<LogbookEntry>[] = [
    {
        id: "date",
        header: "Flight date / route",
        render: (row) => (
            <span className="font-semibold">
                <time dateTime={row.flight_date}>{entry_date(row.flight_date)}{row.std ? `, ${entry_time(row.std)} UTC` : ""}</time>
                <span className="block text-xs font-medium text-slate-600">{entry_reference(row)}</span>
            </span>
        ),
    },
    { id: "aircraft", header: "Aircraft", render: (row) => row.aircraft.registration, cell_class_name: "font-medium" },
    { id: "flight_type", header: "Flight type", render: (row) => row.flight_type.type_name, cell_class_name: "font-medium" },
    { id: "status", header: "Status", render: (row) => <LogbookStatusBadge status={row.flight_status.status_name} /> },
    { id: "pic", header: "Pilot in command", render: (row) => employee_name(row.pic), cell_class_name: "font-medium" },
    {
        id: "action",
        header: "Action",
        render: (row) => (
            <Link to={`/logbook/${row.sector_UUID}`} aria-label={`View ${row.route} flight on ${row.flight_date}`}
                className="inline-flex min-h-8 items-center whitespace-nowrap font-semibold text-link">
                View entry
            </Link>
        ),
    },
];

export default function LogbookTable({ rows, is_filtered }: { rows: LogbookEntry[]; is_filtered: boolean }) {
    return (
        <DataTable inventory
            columns={columns}
            rows={rows}
            get_row_key={(row) => row.sector_UUID}
            caption="Logbook entries"
            empty_title={is_filtered ? "No matching entries" : "No logbook entries yet"}
            empty_description={is_filtered ? "Try different filters." : undefined}
        />
    );
}
