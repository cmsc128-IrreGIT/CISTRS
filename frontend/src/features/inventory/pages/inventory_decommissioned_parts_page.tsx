import EmptyState from "../../../shared/components/feedback/empty_state";
import InventoryListFilters from "../components/inventory_list_filters";
import {
    InventoryBreadcrumbs,
    InventoryTabs,
} from "../components/inventory_workspace";
import useInventoryFilters from "../hooks/use_inventory_filters";
import { useState } from "react";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import Pagination from "../../../shared/components/ui/pagination";
import Card from "../../../shared/components/ui/card";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import InventoryLifecycleDialog from "../components/inventory_lifecycle_dialog";
import type { InventoryItem } from "../types/inventory_types";
import useInventory from "../hooks/use_inventory";
import useDecommissionedInventory from "../hooks/use_inventory_decommission";

import { DECOMMISSIONED_PAGE_SIZE } from "../constants/inventory_constants";

const columns = (
    on_request_restore: (item: InventoryItem) => void,
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
        id: "status",
        header: "Status",
        render: () => (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Decommissioned
            </span>
        ),
    },
    {
        id: "actions",
        header: "Actions",
        render: (row) => (
            <button
                type="button"
                onClick={() => on_request_restore(row)}
                className="inline-flex min-h-11 items-center font-medium text-green-700 underline underline-offset-4 hover:text-green-900"
            >
                Restore
            </button>
        ),
    },
];

export default function DecommissionedPartsPage() {
    const {
        items: inventory_items,
        is_loading,
        error,
        reload,
    } = useInventory();

    const { is_decommissioned, restore_item } = useDecommissionedInventory();

    const [stock_filter, set_stock_filter] = useState("");
    const [selected_item, set_selected_item] = useState<InventoryItem | null>(
        null,
    );

    const decommissioned_items = inventory_items.filter((item) =>
        is_decommissioned(item.part_UUID),
    );

    const filters = useInventoryFilters(
        decommissioned_items,
        stock_filter,
        set_stock_filter,
    );
    const results = [...filters.filtered_items].sort((first, second) =>
        first.part_name.localeCompare(second.part_name),
    );
    const filter_key = JSON.stringify([
        filters.search,
        filters.location,
        stock_filter,
    ]);

    const { visible_rows, footer } = useTablePagination(
        results,
        filter_key,
        DECOMMISSIONED_PAGE_SIZE,
    );

    return (
        <section aria-labelledby="page_title" className="space-y-6">
            <InventoryBreadcrumbs current="Decommissioned parts" />
            <h1 id="page_title" className="sr-only">
                Decommissioned parts
            </h1>
            <Card>
                <InventoryTabs />
                <InventoryListFilters
                    items={decommissioned_items}
                    filters={filters}
                    show_category={false}
                />
                {is_loading ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                        Loading decommissioned parts...
                    </p>
                ) : error ? (
                    <div
                        role="alert"
                        className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    >
                        <p>{error}</p>
                        <button
                            type="button"
                            onClick={reload}
                            className="mt-2 font-medium underline underline-offset-4"
                        >
                            Try again
                        </button>
                    </div>
                ) : !results.length ? (
                    <EmptyState
                        title={
                            filters.is_filtered
                                ? "No matching parts"
                                : "No decommissioned parts"
                        }
                        description={
                            filters.is_filtered
                                ? "Try changing the filters."
                                : "Parts marked as decommissioned will appear here."
                        }
                    />
                ) : (
                    <>
                        <DataTable
                            caption="Decommissioned aircraft parts and supplies"
                            columns={columns(set_selected_item)}
                            rows={visible_rows}
                            get_row_key={(row) => row.part_UUID}
                            inventory
                        />

                        <Pagination {...footer} item_label="part" />
                    </>
                )}
            </Card>

            {selected_item && (
                <InventoryLifecycleDialog item={selected_item} restore
                    on_close={() => set_selected_item(null)}
                    on_saved={() => {
                        restore_item(selected_item.part_UUID);
                        set_selected_item(null);
                    }} />
            )}
        </section>
    );
}
