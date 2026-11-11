import { Link } from "react-router";
import DataTable, {
    type TableColumn,
} from "../../../shared/components/ui/data_table";
import EmptyState from "../../../shared/components/feedback/empty_state";
import type { InventoryItem } from "../types/inventory_types";

import {
    STOCK_STATUS_LABELS,
    STOCK_STATUS_STYLES,
} from "../constants/inventory_constants";
import { get_stock_status } from "../utils/stock_status";

import { format_inventory_expiry } from "../utils/inventory_dates";

const location: TableColumn<InventoryItem> = {
    id: "location",
    header: "Location",
    render: ({ locations }) =>
        locations?.length ? (
            <ul role="list" className="space-y-1.5">
                {locations.map(
                    ({ status_UUID, location_name, storage_area }) => (
                        <li key={status_UUID} className="leading-snug">
                            <span className="font-medium">{location_name}</span>
                            {storage_area && (
                                <span className="text-xs text-slate-600">
                                    {" · "}
                                    {storage_area}
                                </span>
                            )}
                        </li>
                    ),
                )}
            </ul>
        ) : (
            "—"
        ),
};

const expiry_column: TableColumn<InventoryItem> = {
    id: "expiry",
    header: "Expiry",
    render: format_inventory_expiry,
};
const columns: TableColumn<InventoryItem>[] = [
    {
        id: "item",
        header: "Item / part number",
        render: (row) => (
            <>
                <span className="block font-semibold">{row.part_name}</span>
                <span className="text-xs font-medium">{row.part_number}</span>
            </>
        ),
    },
    {
        id: "category",
        header: "Category",
        render: (row) => row.category?.trim() || "—",
    },
    location,
    {
        id: "quantity",
        header: "Quantity",
        render: (row) => row.total_quantity,
        cell_class_name: "tabular-nums font-semibold",
    },
    {
        id: "status",
        header: "Stock status",
        render: (row) => {
            const status = get_stock_status(row);
            return (
                <span
                    className={`inline-block whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${STOCK_STATUS_STYLES[status]}`}
                >
                    {STOCK_STATUS_LABELS[status]}
                </span>
            );
        },
    },
    expiry_column,
    {
        id: "actions",
        header: "Action",
        render: (row) => (
            <Link
                to={`/inventory/${row.part_UUID}`}
                aria-label={`View ${row.part_name}`}
                className="inline-flex min-h-8 items-center rounded font-semibold underline underline-offset-4 focus-visible:outline-2"
            >
                View
            </Link>
        ),
    },
];

const lookup_columns: TableColumn<InventoryItem>[] = [
    { id: "name", header: "Item", render: (row) => row.part_name },
    {
        id: "part_number",
        header: "Part number",
        render: (row) => row.part_number,
    },
    location,
    {
        id: "available",
        header: "Available",
        render: (row) => `${row.total_quantity} ${row.unit_of_measure}`,
    },
    expiry_column,
];

export default function InventoryTable({
    rows,
    is_filtered = false,
    read_only = false,
    show_category = false,
}: {
    rows: InventoryItem[];
    is_filtered?: boolean;
    read_only?: boolean;
    show_category?: boolean;
}) {
    if (!rows.length) {
        return (
            <EmptyState
                title={
                    is_filtered
                        ? "No matching items"
                        : read_only
                          ? "No parts available"
                          : "No inventory items yet"
                }
                description={
                    is_filtered
                        ? "Try another search term or clear the filters."
                        : read_only
                          ? undefined
                          : "Use Add item to add your first part or supply."
                }
            />
        );
    }
    return (
        <DataTable
            inventory
            caption={
                read_only
                    ? "Parts available"
                    : "Inventory: aircraft parts and supplies"
            }
            columns={
                read_only
                    ? lookup_columns
                    : columns.filter(
                          (column) => show_category || column.id !== "category",
                      )
            }
            rows={rows}
            get_row_key={(row) => row.part_UUID}
        />
    );
}
