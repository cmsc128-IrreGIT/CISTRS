import { Link } from "react-router";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import type { InventoryTransaction } from "../../inventory/types/inventory_types";

const columns: TableColumn<InventoryTransaction>[] = [
    {
        id: "time",
        header: "Time",
        render: (row) => (
            <time dateTime={row.created_at}>
                {new Date(row.created_at).toLocaleString()}
            </time>
        ),
    },
    {
        id: "user",
        header: "User",
        render: (row) => `${row.updater.f_name} ${row.updater.l_name}`,
    },
    {
        id: "action",
        header: "Action",
        render: (row) =>
            `${row.transaction_type} (${row.quantity_change > 0 ? "+" : ""}${row.quantity_change})`,
    },
    {
        id: "details",
        header: "Details",
        render: (row) => (
            <Link
                to={`/inventory/${row.status.part.part_UUID}`}
                className="rounded-sm text-sm font-medium text-slate-600 underline underline-offset-4 decoration-slate-300 hover:text-[#0b2238] hover:decoration-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
            >
                {row.status.part.part_name}
            </Link>
        ),
    },
];

type RecentActivityTableProps = {
    rows: InventoryTransaction[];
};

export default function RecentActivityTable({
    rows,
}: RecentActivityTableProps) {
    if (rows.length === 0)
        return (
            <p className="py-2 text-sm text-slate-500">
                No activity recorded yet. Stock transactions will appear here.
            </p>
        );
    return (
        <DataTable
            compact_empty
            caption="Recent inventory activity"
            columns={columns}
            rows={rows}
            get_row_key={(row) => row.transaction_UUID}
            empty_title="No activity recorded yet"
            empty_description="Stock transactions will appear here."
        />
    );
}
