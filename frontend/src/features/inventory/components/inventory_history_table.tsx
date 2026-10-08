import { Link } from "react-router";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import type { InventoryChange } from "../types/inventory_types";

const field_labels = [
    { key: "name", label: "Item name" },
    { key: "part_number", label: "Part number" },
    { key: "category", label: "Category" },
    { key: "quantity", label: "Quantity" },
    { key: "unit", label: "Unit" },
    { key: "aircraft", label: "Aircraft" },
] as const;

function format_value(value: string | number | null) {
    return value === null ? "Unassigned" : String(value);
}

const columns: TableColumn<InventoryChange>[] = [
    {
        id: "time",
        header: "Date and Time",
        render: (row) => (
            <time dateTime={row.recorded_at}>
                {new Date(row.recorded_at).toLocaleString()}
            </time>
        ),
    },
    {
        id: "item",
        header: "Item",
        render: (row) => (
            <Link
                to={`/inventory/${row.item_id}`}
                className="rounded-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
                {row.after.name}
            </Link>
        ),
    },
    {
        id: "action",
        header: "Action",
        render: (row) => row.action,
    },
    {
        id: "changes",
        header: "Recorded Changes",
        render: (row) => {
            const before = row.before;

            return (
                <ul className="min-w-56 space-y-1">
                    {field_labels
                        .filter(
                            ({ key }) =>
                                !before || before[key] !== row.after[key],
                        )
                        .map(({ key, label }) => (
                            <li key={key}>
                                <span className="font-medium">{label}: </span>
                                {before
                                    ? `${format_value(before[key])} → ${format_value(row.after[key])}`
                                    : format_value(row.after[key])}
                            </li>
                        ))}
                </ul>
            );
        },
    },
];

type InventoryHistoryTableProps = {
    rows: InventoryChange[];
    caption?: string;
};

export default function InventoryHistoryTable({
    rows,
    caption = "Inventory change history",
}: InventoryHistoryTableProps) {
    return (
        <DataTable
            caption={caption}
            columns={columns}
            rows={rows}
            get_row_key={(row) => row.id}
            empty_title="No changes recorded yet"
            empty_description="Recorded additions and updates will appear here."
        />
    );
}
