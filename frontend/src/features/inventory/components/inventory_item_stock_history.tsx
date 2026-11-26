import { useState } from "react";
import Button from "../../../shared/components/ui/button";
import Pagination from "../../../shared/components/ui/pagination";
import EmptyState from "../../../shared/components/feedback/empty_state";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import { STOCK_HISTORY_PAGE_SIZE } from "../constants/stock_history_constants";
import useInventoryHistory from "../hooks/use_inventory_history";
import type { InventoryTransaction } from "../types/inventory_types";
import { StockMovementDetails, StockMovementTable } from "./stock_movements";

export default function InventoryItemStockHistory({
    part_id,
}: {
    part_id: string;
}) {
    const { history, is_loading, error, reload } = useInventoryHistory(
        true,
        part_id,
    );
    const [selected, set_selected] = useState<InventoryTransaction | null>(
        null,
    );
    const movements = history
        .filter((row) => row.status.part.part_UUID === part_id)
        .sort(
            (first, second) =>
                Date.parse(second.created_at) - Date.parse(first.created_at),
        );
    const { visible_rows, footer } = useTablePagination(
        movements,
        part_id,
        STOCK_HISTORY_PAGE_SIZE,
    );

    if (is_loading) {
        return <ScreenLoading compact label="Loading stock history…" />;
    }
    if (error) {
        return (
            <div role="alert" className="text-sm text-red-700">
                <p>{error}</p>
                <Button variant="ghost" onClick={() => void reload()}>
                    Try again
                </Button>
            </div>
        );
    }
    if (!movements.length) {
        return (
            <EmptyState
                title="No stock movements yet"
                description="Receipts, issues, and adjustments for this item will appear here."
            />
        );
    }

    return (
        <>
            <StockMovementTable
                bounded
                rows={visible_rows}
                has_history
                show_item={false}
                show_reference={movements.some(
                    (row) => row.reference?.trim() || row.recipient?.trim(),
                )}
                on_view={set_selected}
            />
            <Pagination {...footer} item_label="movement" />
            {selected && (
                <StockMovementDetails
                    selected={selected}
                    on_close={() => set_selected(null)}
                />
            )}
        </>
    );
}
