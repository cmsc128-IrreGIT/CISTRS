import { Link } from "react-router";
import { employee_name } from "../../../shared/utils/employee_name";
import DataTable, {
    type TableColumn,
    type TableRowHighlight,
} from "../../../shared/components/ui/data_table";
import DetailsList from "../../../shared/components/ui/details_list";
import StatusBadge from "../../../shared/components/ui/status_badge";
import Button from "../../../shared/components/ui/button";
import FormDialog from "../../../shared/components/ui/form_dialog";
import { INVENTORY_DATE_OPTIONS, INVENTORY_PRIMARY_ACTION } from "../constants/inventory_constants";
import { STOCK_MOVEMENT_TONES } from "../constants/stock_history_constants";
import { inventory_location_label, inventory_request_date } from "../utils/inventory_workflows";
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
    bounded = false,
    on_view,
    highlight_row,
}: {
    rows: InventoryTransaction[];
    has_history: boolean;
    show_reference: boolean;
    show_item?: boolean;
    bounded?: boolean;
    on_view: (row: InventoryTransaction) => void;
    highlight_row?: TableRowHighlight;
}) {
    const columns: TableColumn<InventoryTransaction>[] = [
        {
            id: "date",
            header: "Date",
            render: (row) => {
                if (row.movement_date) {
                    return <time dateTime={row.movement_date}>{inventory_request_date(row.movement_date)}</time>;
                }
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
                    className="text-link"
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
            bounded={bounded}
            columns={columns.filter(
                (column) =>
                    (show_reference || column.id !== "reference") &&
                    (show_item || column.id !== "item"),
            )}
            rows={rows}
            get_row_key={(row) => row.transaction_UUID}
            highlight_row={highlight_row}
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
        <FormDialog title="Stock movement details" on_close={on_close} compact>
            <div className="p-4 sm:px-5">
                <div className="rounded-md bg-slate-100 p-4">
                    <DetailsList
                        entries={[
                            {
                                id: "item",
                                label: "Item",
                                value: selected.status.part.part_name,
                            },
                            {
                                id: "date",
                                label: selected.movement_date ? "Movement date" : "Date and time",
                                value: selected.movement_date ? inventory_request_date(selected.movement_date) : new Date(selected.created_at).toLocaleString(),
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
                            ...(selected.supplier_name ? [{ id: "supplier", label: "Supplier", value: selected.supplier_name }] : []),
                            ...(selected.aircraft ? [{ id: "aircraft", label: "Aircraft", value: selected.aircraft }] : []),
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
                                label: "Location / Storage area",
                                value: inventory_location_label(selected.status.location),
                            },
                            {
                                id: "staff",
                                label: "Recorded by",
                                value: employee_name(selected.updater) || "Not recorded",
                            },
                            {
                                id: "remarks",
                                label: "Remarks",
                                value: selected.remarks || "—",
                            },
                        ]}
                    />
                </div>
            </div>
            <div className="flex justify-end border-t border-slate-200 px-4 py-3 sm:px-5">
                <Button className={INVENTORY_PRIMARY_ACTION} onClick={on_close}>Close</Button>
            </div>
        </FormDialog>
    );
}
