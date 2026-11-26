import { useState } from "react";
import Card from "../../../shared/components/ui/card";
import Button from "../../../shared/components/ui/button";
import Pagination from "../../../shared/components/ui/pagination";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import {
    InventoryBreadcrumbs,
    InventoryTabs,
} from "../components/inventory_workspace";
import {
    StockMovementDetails,
    StockMovementTable,
} from "../components/stock_movements";
import useInventoryHistory from "../hooks/use_inventory_history";
import type { InventoryTransaction } from "../types/inventory_types";

export default function InventoryCorrectionsPage() {
    const { history, is_loading, error, reload } = useInventoryHistory();
    const [selected, set_selected] = useState<InventoryTransaction | null>(
        null,
    );
    const rows = history.filter((row) => row.transaction_type === "ADJUSTMENT");
    const { visible_rows, footer } = useTablePagination(rows, "corrections");
    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <InventoryBreadcrumbs current="Stock corrections" />
            <h1 id="page_title" className="sr-only">
                Stock corrections
            </h1>
            <Card>
                <InventoryTabs />
                {is_loading ? (
                    <ScreenLoading
                        compact
                        label="Loading stock corrections..."
                    />
                ) : error ? (
                    <div role="alert">
                        <p className="text-sm text-red-700">{error}</p>
                        <Button variant="ghost" onClick={() => void reload()}>
                            Try again
                        </Button>
                    </div>
                ) : (
                    <>
                        <StockMovementTable
                            rows={visible_rows}
                            has_history={rows.length > 0}
                            show_reference={false}
                            on_view={set_selected}
                        />
                        <Pagination {...footer} item_label="adjustment" />
                    </>
                )}
            </Card>
            {selected && (
                <StockMovementDetails
                    selected={selected}
                    on_close={() => set_selected(null)}
                />
            )}
        </section>
    );
}
