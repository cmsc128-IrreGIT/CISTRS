import { Download } from "lucide-react";
import { useState } from "react";
import FeatureHelp from "../../../shared/components/feedback/feature_help";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import Card from "../../../shared/components/ui/card";
import Button from "../../../shared/components/ui/button";
import SearchInput from "../../../shared/components/forms/search_input";
import useRecordHighlight from "../../../shared/hooks/use_record_highlight";
import { employee_name } from "../../../shared/utils/employee_name";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import Pagination from "../../../shared/components/ui/pagination";
import {
    InventoryBreadcrumbs,
    InventoryTabs,
} from "../components/inventory_workspace";
import useInventoryHistory from "../hooks/use_inventory_history";
import type { InventoryTransaction } from "../types/inventory_types";

import {
    StockMovementDetails,
    StockMovementTable,
} from "../components/stock_movements";
import {
    INVENTORY_PRIMARY_ACTION,
    INVENTORY_FILTER_SELECT,
} from "../constants/inventory_constants";
import {
    STOCK_HISTORY_DATE_RANGES,
    STOCK_HISTORY_PAGE_SIZE,
} from "../constants/stock_history_constants";
import { export_stock_history, format_movement } from "../utils/stock_history";

export default function InventoryHistoryPage() {
    const { history, is_loading, error, reload } = useInventoryHistory();
    const highlight = useRecordHighlight();
    const [search, set_search] = useState("");
    const [action, set_action] = useState("");
    const [days, set_days] = useState("");
    const [selected, set_selected] = useState<InventoryTransaction | null>(
        null,
    );
    const term = search.trim().toLowerCase();
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (Number(days) - 1));
    const cutoff_day = new Date(
        cutoff.getTime() - cutoff.getTimezoneOffset() * 60_000,
    )
        .toISOString()
        .slice(0, 10);
    const show_reference = history.some(
        (row) => row.reference?.trim() || row.recipient?.trim(),
    );
    const types = [...new Set(history.map(format_movement))].sort();
    const filtered = history
        .filter(
            (row) =>
                (!action || format_movement(row) === action) &&
                (!days ||
                    (row.movement_date
                        ? row.movement_date.slice(0, 10) >= cutoff_day
                        : Date.parse(row.created_at) >= cutoff.getTime())) &&
                [
                    row.status.part.part_name,
                    row.status.part.part_number,
                    row.status.location.location_name,
                    employee_name(row.updater),
                    row.remarks ?? "",
                    row.reference ?? "",
                    row.transaction_UUID,
                    row.recipient ?? "",
                ].some((value) => value.toLowerCase().includes(term)),
        )
        .sort(
            (first, second) =>
                Date.parse(second.created_at) - Date.parse(first.created_at),
        );
    const { visible_rows, footer } = useTablePagination(
        filtered,
        JSON.stringify([term, action, days]),
        STOCK_HISTORY_PAGE_SIZE,
        filtered.findIndex((row) => row.transaction_UUID === highlight?.id),
    );
    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <InventoryBreadcrumbs current="Stock History" />
            <h1 id="page_title" className="sr-only">
                Stock History
            </h1>
            <Card>
                <InventoryTabs />
                {is_loading ? (
                    <ScreenLoading compact label="Loading inventory history…" />
                ) : error ? (
                    <div role="alert" className="text-sm text-red-700">
                        <p>{error}</p>
                        <Button variant="ghost" onClick={() => void reload()}>
                            Try again
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="filter-toolbar mb-4 rounded-md bg-[#f5f8fa] p-4">
                            <div className="filter-toolbar-search grid gap-1.5">
                                <p
                                    aria-hidden="true"
                                    className="text-sm font-medium"
                                >
                                    Search
                                </p>
                                <SearchInput
                                    value={search}
                                    on_change={set_search}
                                    label="Search inventory history"
                                    placeholder={
                                        show_reference
                                            ? "Item, reference, or recipient"
                                            : "Item, location, or recorded by"
                                    }
                                />
                            </div>
                            <label className="filter-toolbar-field grid gap-1.5 text-sm font-medium">
                                Movement
                                <select
                                    className={INVENTORY_FILTER_SELECT}
                                    value={action}
                                    onChange={(event) =>
                                        set_action(event.currentTarget.value)
                                    }
                                >
                                    <option value="">All movements</option>
                                    {types.map((value) => (
                                        <option key={value}>{value}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="filter-toolbar-field grid gap-1.5 text-sm font-medium">
                                Date range
                                <select
                                    className={INVENTORY_FILTER_SELECT}
                                    value={days}
                                    onChange={(event) =>
                                        set_days(event.currentTarget.value)
                                    }
                                >
                                    <option value="">All dates</option>
                                    {STOCK_HISTORY_DATE_RANGES.map((days) => (
                                        <option key={days} value={days}>
                                            Last {days} days
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <div className="filter-toolbar-actions">
                                <Button
                                    className={INVENTORY_PRIMARY_ACTION}
                                    disabled={!filtered.length}
                                    onClick={() =>
                                        export_stock_history(filtered)
                                    }
                                >
                                    <Download size={17} aria-hidden="true" />{" "}
                                    Export records
                                </Button>
                                <FeatureHelp
                                    title="exporting stock movements"
                                    guide_id="export"
                                />
                            </div>
                        </div>
                        {highlight &&
                            !history.some(
                                (row) => row.transaction_UUID === highlight.id,
                            ) && (
                                <p
                                    role="status"
                                    className="mb-3 text-sm text-slate-600"
                                >
                                    The linked transaction is unavailable in
                                    recent Stock History.
                                </p>
                            )}
                        <h2 className="mb-3 text-base font-semibold text-[#0b2238]">
                            Receipts and issues
                        </h2>
                        <StockMovementTable
                            rows={visible_rows}
                            has_history={history.length > 0}
                            show_reference={show_reference}
                            on_view={set_selected}
                            highlight_row={highlight}
                        />
                        <Pagination {...footer} item_label="movement" />
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
