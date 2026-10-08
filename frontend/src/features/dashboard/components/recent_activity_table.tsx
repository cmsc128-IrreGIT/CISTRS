import { Link } from "react-router";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import type { InventoryChange } from "../../inventory/types/inventory_types";

const columns: TableColumn<InventoryChange>[] = [
    {
        id: "time",
        header: "Time",
        render: (row) => (
            <time dateTime={row.recorded_at}>
                {new Date(row.recorded_at).toLocaleString()}
            </time>
        ),
    },
    {
        id: "user",
        header: "User",
        render: () => "Not recorded",
    },
    {
        id: "action",
        header: "Action",
        render: (row) => `${row.action} inventory item`,
    },
    {
        id: "details",
        header: "Details",
        render: (row) => (
            <Link
                to={`/inventory/${row.item_id}`}
                className="rounded-sm text-sm font-medium text-slate-600 underline underline-offset-4 decoration-slate-300 hover:text-[#0b2238] hover:decoration-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
            >
                {row.after.name}
            </Link>
        ),
    },
];

type RecentActivityTableProps = {
    rows: InventoryChange[];
};

export default function RecentActivityTable({
    rows,
}: RecentActivityTableProps) {
    return (
        <DataTable
            caption="Recent inventory activity"
            columns={columns}
            rows={rows}
            get_row_key={(row) => row.id}
            empty_title="No activity recorded yet"
            empty_description="Add or edit an inventory item to see activity here."
        />
    );
}
