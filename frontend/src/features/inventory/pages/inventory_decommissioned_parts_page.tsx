
import { useState } from "react";
import Pagination from "../../../shared/components/ui/pagination";
import SearchInput from "../../../shared/components/forms/search_input";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import BackLink from "../../../shared/components/navigation/back_link";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import ConfirmationModal from "../../../shared/components/ui/confirmation_modal";
import type { InventoryItem } from "../types/inventory_types";
import useInventory from "../hooks/use_inventory";
import useDecommissionedInventory from "../hooks/use_inventory_decommission";

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

    const {
        is_decommissioned,
        restore_item,
    } = useDecommissionedInventory();

    const [search, set_search] = useState("");
    const [pagination, set_pagination] = useState({
        key: "",
        page: 1,
    });
    const [selected_item, set_selected_item] = useState<InventoryItem | null>(null);

    const decommissioned_items = inventory_items.filter(
        (item) => is_decommissioned(item.part_UUID)
    );

    const results = decommissioned_items
        .filter((item) => {
            const query = search.toLowerCase().trim();

            return (
                item.part_name.toLowerCase().includes(query) ||
                item.part_number.toLowerCase().includes(query)
            );
        })
        .sort((first, second) =>
            first.part_name.localeCompare(second.part_name)
        );

    const page_size = 10;
    const total_pages = Math.max(
        1,
        Math.ceil(results.length / page_size)
    );

    const page =
        pagination.key === search
            ? Math.min(pagination.page, total_pages)
            : 1;

    const visible_items = results.slice(
        (page - 1) * page_size,
        page * page_size
    );

    const handle_confirm = () => {
        if (!selected_item) return;

        restore_item(selected_item.part_UUID);
        set_selected_item(null);
    };

    return (
        <section aria-labelledby="page_title" className="space-y-6">
            <BackLink to="/inventory" label="Back to inventory" />

            <PageHeader
                title="Decommissioned Parts"
                title_id="page_title"
                description="View and restore parts removed from active inventory."
            />

            <Card>
                <div className="mb-5 max-w-md">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                        Search decommissioned parts
                    </p>
                    <SearchInput
                        value={search}
                        on_change={set_search}
                        label="Search decommissioned parts"
                        placeholder="Item name or part number"
                    />
                </div>

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
                ) : (
                    <>
                        <p role="status" className="mb-3 text-sm text-slate-500">
                            {results.length === 0
                                ? "No decommissioned parts shown"
                                : `Showing ${(page - 1) * page_size + 1}–${Math.min(page * page_size, results.length)} of ${results.length} parts`}
                        </p>

                        <DataTable
                            caption="Decommissioned aircraft parts and supplies"
                            columns={columns(set_selected_item)}
                            rows={visible_items}
                            get_row_key={(row) => row.part_UUID}
                            empty_title={
                                search
                                    ? "No matching parts"
                                    : "No decommissioned parts"
                            }
                            empty_description={
                                search
                                    ? "Try another search term."
                                    : "Decommissioned parts will appear here."
                            }
                        />

                        <div className="mt-4">
                            <Pagination
                                page={page}
                                total_pages={total_pages}
                                on_page_change={(next_page) =>
                                    set_pagination({
                                        key: search,
                                        page: next_page,
                                    })
                                }
                            />
                        </div>
                    </>
                )}
            </Card>

            <ConfirmationModal
                is_open={selected_item !== null}
                title="Restore Part?"
                message={
                    <>
                        Are you sure you want to restore{" "}
                        <strong className="font-semibold text-slate-900">
                            {selected_item?.part_name ?? "this part"}
                        </strong>{" "}
                        to active inventory?
                    </>
                }
                confirm_label="Restore"
                on_confirm={handle_confirm}
                on_cancel={() => set_selected_item(null)}
            />
        </section>
    );
}
