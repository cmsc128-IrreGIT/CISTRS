import Button from "../../../shared/components/ui/button";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import type { LogbookEntry } from "../types/logbook_types";
export default function LogbookTable({
    rows,
    selected_id,
    on_select,
    is_filtered,
}: {
    rows: LogbookEntry[];
    selected_id: string | null;
    on_select: (id: string) => void;
    is_filtered: boolean;
}) {
    const columns: TableColumn<LogbookEntry>[] = [
        {
            id: "date",
            header: "Entry Date (UTC)",
            render: (row) => (
                <time dateTime={row.entry_date}>{row.entry_date}</time>
            ),
        },
        { id: "aircraft", header: "Aircraft", render: (row) => row.aircraft },
        {
            id: "route",
            header: "Route",
            render: (row) =>
                `${row.station_from || "Not recorded"} → ${row.station_to || "Not recorded"}`,
        },
        {
            id: "defects",
            header: "Defects / Remarks",
            cell_class_name: "max-w-72",
            render: (row) => (
                <p className="line-clamp-2 break-words">{row.defects}</p>
            ),
        },
        {
            id: "action",
            header: "Action",
            render: (row) => (
                <Button
                    variant="ghost"
                    aria-label={`View entry for ${row.aircraft} on ${row.entry_date}`}
                    aria-expanded={selected_id === row.id}
                    aria-controls="log_entry_details"
                    onClick={() => on_select(row.id)}
                >
                    View
                </Button>
            ),
        },
    ];
    return (
        <DataTable
            columns={columns}
            rows={rows}
            get_row_key={(row) => row.id}
            caption="Technical logbook entries"
            empty_title={
                is_filtered ? "No matching entries" : "No logbook entries yet"
            }
            empty_description="Add an entry or adjust your filters."
        />
    );
}
