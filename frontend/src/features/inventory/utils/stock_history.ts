import {
    STOCK_HISTORY_CSV_HEADERS,
    STOCK_HISTORY_CSV_NAME,
    STOCK_MOVEMENT_LABELS,
} from "../constants/stock_history_constants";
import type { InventoryTransaction } from "../types/inventory_types";

export function format_movement(row: InventoryTransaction) {
    return (
        STOCK_MOVEMENT_LABELS[row.transaction_type.toUpperCase()] ??
        row.transaction_type
    );
}

export function format_signed_quantity(quantity: number) {
    return quantity > 0 ? `+${quantity}` : String(quantity);
}

export function format_quantity_change(row: InventoryTransaction) {
    return [
        format_signed_quantity(row.quantity_change),
        row.status.part.unit_of_measure,
    ]
        .filter(Boolean)
        .join(" ");
}

export function export_stock_history(rows: InventoryTransaction[]) {
    const cells = [
        STOCK_HISTORY_CSV_HEADERS,
        ...rows.map((row) => [
            row.movement_date?.slice(0, 10) ?? row.created_at,
            row.status.part.part_name,
            row.status.part.part_number,
            format_movement(row),
            format_quantity_change(row),
            row.reference?.trim() ?? "",
            row.transaction_UUID,
            row.recipient ?? "",
            row.status.location.location_name,
            `${row.updater.f_name} ${row.updater.l_name}`,
            row.remarks ?? "",
        ]),
    ];
    const csv = cells
        .map((row) =>
            row
                .map((value) => {
                    const escaped =
                        /^[=+@-]/.test(value.trimStart()) &&
                        !/^[+-]?\d+(\.\d+)?$/.test(value)
                            ? `'${value}`
                            : value;
                    return `"${escaped.replaceAll('"', '""')}"`;
                })
                .join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
        new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = STOCK_HISTORY_CSV_NAME;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
