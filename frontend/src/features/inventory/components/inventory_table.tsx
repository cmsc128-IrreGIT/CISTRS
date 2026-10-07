import { Link } from "react-router";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import StatusBadge from "../../../shared/components/ui/status_badge";
import type { InventoryItem } from "../types/inventory_types";

const columns: TableColumn<InventoryItem>[] = [
    {
        id: "part_number",
        header: "Part Number",
        render: (row) => row.part_number,
    },
    { id: "name", header: "Item Name", render: (row) => row.name },
    { id: "category", header: "Category", render: (row) => row.category },
    {
        id: "quantity",
        header: "Quantity",
        render: (row) => `${row.quantity} ${row.unit}`,
    },
    {
        id: "aircraft",
        header: "Associated Aircraft",
        render: (row) => row.aircraft ?? "Unassigned",
    },
    {
        id: "availability",
        header: "Stock Availability",
        render: (row) => (
            <StatusBadge tone={row.quantity > 0 ? "success" : "danger"}>
                {row.quantity > 0 ? "In stock" : "Out of stock"}
            </StatusBadge>
        ),
    },
    {
        id: "actions",
        header: "Actions",
        render: (row) => (
            <Link
                to={`/inventory/${row.id}`}
                aria-label={`View ${row.name}`}
                className="font-medium text-red-700 underline"
            >
                View
            </Link>
        ),
    },
];

type InventoryTableProps = {
    rows: InventoryItem[];
    is_filtered: boolean;
};

export default function InventoryTable({
    rows,
    is_filtered,
}: InventoryTableProps) {
    return (
        <DataTable
            caption="Inventory preview: aircraft parts and supplies"
            columns={columns}
            rows={rows}
            get_row_key={(row) => row.id}
            empty_title={
                is_filtered ? "No matching items" : "No inventory records yet"
            }
            empty_description={
                is_filtered
                    ? "Try another search term or aircraft filter."
                    : "Added parts and supplies will appear here."
            }
        />
    );
}
