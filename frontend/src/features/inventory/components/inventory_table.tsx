import { useState } from "react";
import { Archive } from "lucide-react";
import { Link } from "react-router";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import StatusBadge from "../../../shared/components/ui/status_badge";
import ConfirmationModal from "../../../shared/components/ui/confirmation_modal";
import type { InventoryItem } from "../types/inventory_types";

const columns = (
    on_decommission: (item: InventoryItem) => void,
): TableColumn<InventoryItem>[] => [
    {
        id: "part_number",
        header: "Part Number",
        render: (row) => row.part_number,
    },
    {
        id: "name",
        header: "Item Name",
        render: (row) => row.part_name,
    },
    {
        id: "quantity",
        header: "Quantity",
        render: (row) => `${row.total_quantity} ${row.unit_of_measure}`,
    },
    {
        id: "availability",
        header: "Stock Availability",
        render: (row) => (
            <StatusBadge tone={row.total_quantity > 0 ? "success" : "danger"}>
                {row.total_quantity > 0 ? "In stock" : "Out of stock"}
            </StatusBadge>
        ),
    },
    {
        id: "actions",
        header: "Actions",
        render: (row) => (
            <div className="flex flex-wrap items-center gap-4">
                <Link
                    to={`/inventory/${row.part_UUID}`}
                    aria-label={`View ${row.part_name}`}
                    className="inline-flex min-h-11 items-center font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
                >
                    View
                </Link>
                <button
                    type="button"
                    onClick={() => on_decommission(row)}
                    aria-label={`Decommission ${row.part_name}`}
                    className="inline-flex min-h-11 items-center font-medium text-red-600 underline underline-offset-4 hover:text-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                    <Archive size={18} aria-hidden="true" />
                </button>
            </div>
        ),
    },
];


type InventoryTableProps = {
    rows: InventoryItem[];
    is_filtered: boolean;
    on_decommission: (id: InventoryItem["part_UUID"]) => void;
};

export default function InventoryTable({
    rows,
    is_filtered,
    on_decommission,
}: InventoryTableProps) {
    const [selected_item, set_selected_item] = useState<InventoryItem | null>(null);

    const handle_confirm = () => {
        if (!selected_item) return;

        on_decommission(selected_item.part_UUID);
        set_selected_item(null);
    };
    return (
        <>
        <DataTable
            caption="Inventory preview: aircraft parts and supplies"
            columns={columns(set_selected_item)}
            rows={rows}
            get_row_key={(row) => row.part_UUID}
            empty_title={
                is_filtered ? "No matching items" : "No inventory records yet"
            }
            empty_description={
                is_filtered
                    ? "Try another search term or clear the filters."
                    : "Added parts and supplies will appear here."
            }
        />
        <ConfirmationModal
                is_open={selected_item !== null}
                title="Decommission Part?"
                message={
                    <>
                        Are you sure you want to decommission{" "}
                        <strong className="font-semibold text-slate-900">
                            {selected_item?.part_name ?? "this part"}
                        </strong>
                        ? This part will be removed from active inventory.
                    </>
                }
                confirm_label="Decommission"
                on_confirm={handle_confirm}
                on_cancel={() => set_selected_item(null)}
            />
        </>
    );
}
