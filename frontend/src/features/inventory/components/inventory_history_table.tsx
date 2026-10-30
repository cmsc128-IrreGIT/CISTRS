import { Link } from "react-router";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import type { InventoryTransaction } from "../types/inventory_types";

const columns: TableColumn<InventoryTransaction>[] = [
    {
        id: "time",
        header: "Date and Time",
        render: (row) => (
            <time dateTime={row.created_at}>
                {new Date(row.created_at).toLocaleString()}
            </time>
        ),
    },
    {
        id: "item",
        header: "Item",
        render: (row) => (
            <Link
                to={`/inventory/${row.status.part.part_UUID}`}
                className="rounded-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
                {row.status.part.part_name}
            </Link>
        ),
    },
    {
        id: "part_number",
        header: "Part Number",
        render: (row) => row.status.part.part_number,
    },
    {
        id: "action",
        header: "Action",
        render: (row) => row.transaction_type,
    },
    {
        id: "quantity",
        header: "Quantity Change",
        render: (row) =>
            `${row.quantity_change > 0 ? "+" : ""}${row.quantity_change}`,
    },
    {
        id: "location",
        header: "Location",
        render: (row) => row.status.location.location_name,
    },
    {
        id: "remarks",
        header: "Remarks",
        render: (row) => row.remarks || "No remarks recorded",
    },
    {
        id: "updated_by",
        header: "Updated By",
        render: (row) => `${row.updater.f_name} ${row.updater.l_name}`,
    },
];

type InventoryHistoryTableProps = {
    rows: InventoryTransaction[];
    caption?: string;
};

export default function InventoryHistoryTable({
    rows,
    caption = "Inventory change history",
}: InventoryHistoryTableProps) {
    return (
        <DataTable
            bounded
            compact_empty
            caption={caption}
            columns={columns}
            rows={rows}
            get_row_key={(row) => row.transaction_UUID}
            empty_title="No changes recorded yet"
            empty_description="Recorded inventory transactions will appear here."
        />
    );
}
