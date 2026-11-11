import { Link } from "react-router";
import DataTable, {
    type TableColumn,
} from "../../../shared/components/ui/data_table";
import DetailsList from "../../../shared/components/ui/details_list";
import StatusBadge from "../../../shared/components/ui/status_badge";
import FormDialog from "../../../shared/components/ui/form_dialog";
import { INVENTORY_DATE_OPTIONS } from "../constants/inventory_constants";
import { STOCK_MOVEMENT_TONES } from "../constants/stock_history_constants";
import type { InventoryTransaction } from "../types/inventory_types";
import {
    format_movement,
    format_quantity_change,
    format_signed_quantity,
} from "../utils/stock_history";

const date_format = new Intl.DateTimeFormat("en-GB", INVENTORY_DATE_OPTIONS);

export function StockMovementTable({
    rows,
    has_history,
    show_reference,
    show_item = true,
    on_view,
}: {
    rows: InventoryTransaction[];
    has_history: boolean;
    show_reference: boolean;
    show_item?: boolean;
    on_view: (row: InventoryTransaction) => void;
}) {
    const columns: TableColumn<InventoryTransaction>[] = [
        {
            id: "date",
            header: "Date",
            render: (row) => {
                const date = Date.parse(row.created_at);
                return Number.isNaN(date) ? (
                    "—"
                ) : (
                    <time dateTime={row.created_at}>
                        {date_format.format(date)}
                    </time>
                );
            },
        },
        {
            id: "item",
            header: "Item",
            render: (row) => (
                <Link
                    className="hover:underline focus-visible:outline-2"
                    to={`/inventory/${row.status.part.part_UUID}`}
                >
                    {row.status.part.part_name}
                </Link>
            ),
        },
        {
            id: "movement",
            header: "Movement",
            render: (row) => {
                const label = format_movement(row);
                return (
                    <StatusBadge
                        tone={STOCK_MOVEMENT_TONES[label] ?? "neutral"}
                    >
                        {label}
                    </StatusBadge>
                );
            },
        },
        {
            id: "quantity",
            header: "Quantity",
            render: (row) => {
                const quantity = row.quantity_change;
                const unit = row.status.part.unit_of_measure;
                const color =
                    quantity < 0
                        ? "text-red-700"
                        : quantity > 0
                          ? "text-emerald-800"
                          : "text-slate-700";
                return (
                    <span className="whitespace-nowrap tabular-nums">
                        <span className={`font-semibold ${color}`}>
                            {format_signed_quantity(quantity)}
                        </span>
                        {unit && (
                            <span className="text-xs text-slate-600">
                                {" "}
                                {unit}
                            </span>
                        )}
                    </span>
                );
            },
        },
        {
            id: "reference",
            header: "Reference / recipient",
            render: (row) => (
                <>
                    <span className="block font-medium wrap-anywhere">
                        {row.reference?.trim() || row.recipient?.trim() || "—"}
                    </span>
                    {row.reference?.trim() && row.recipient?.trim() && (
                        <span className="text-xs">{row.recipient.trim()}</span>
                    )}
                </>
            ),
        },
        {
            id: "action",
            header: "Action",
            render: (row) => (
                <button
                    type="button"
                    className="min-h-8 rounded font-semibold underline underline-offset-4 focus-visible:outline-2"
                    aria-label={`View movement for ${row.status.part.part_name}`}
                    onClick={() => on_view(row)}
                >
                    View
                </button>
            ),
        },
    ];
    return (
        <DataTable
            inventory
            caption="Stock movements"
            columns={columns.filter(
                (column) =>
                    (show_reference || column.id !== "reference") &&
                    (show_item || column.id !== "item"),
            )}
            rows={rows}
            get_row_key={(row) => row.transaction_UUID}
            empty_title={
                has_history
                    ? "No history records match these filters."
                    : "No changes recorded yet"
            }
            empty_description={
                has_history
                    ? undefined
                    : "Recorded inventory transactions will appear here."
            }
        />
    );
}

export function StockMovementDetails({
    selected,
    on_close,
}: {
    selected: InventoryTransaction;
    on_close: () => void;
}) {
    return (
        <FormDialog title="Stock movement details" on_close={on_close}>
            <DetailsList
                entries={[
                    {
                        id: "item",
                        label: "Item",
                        value: selected.status.part.part_name,
                    },
                    {
                        id: "date",
                        label: "Date and time",
                        value: new Date(selected.created_at).toLocaleString(),
                    },
                    {
                        id: "reference",
                        label: "Reference",
                        value: selected.reference?.trim() || "—",
                    },
                    {
                        id: "transaction_id",
                        label: "Transaction ID",
                        value: selected.transaction_UUID,
                    },
                    {
                        id: "recipient",
                        label: "Recipient",
                        value: selected.recipient || "—",
                    },
                    {
                        id: "part",
                        label: "Part number",
                        value: selected.status.part.part_number,
                    },
                    {
                        id: "type",
                        label: "Movement",
                        value: format_movement(selected),
                    },
                    {
                        id: "quantity",
                        label: "Quantity",
                        value: format_quantity_change(selected),
                    },
                    {
                        id: "location",
                        label: "Location",
                        value: selected.status.location.location_name,
                    },
                    {
                        id: "staff",
                        label: "Recorded by",
                        value: `${selected.updater.f_name} ${selected.updater.l_name}`,
                    },
                    {
                        id: "remarks",
                        label: "Remarks",
                        value: selected.remarks || "—",
                    },
                ]}
            />
        </FormDialog>
    );
}
