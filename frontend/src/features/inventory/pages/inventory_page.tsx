import { Archive, History, Plus } from "lucide-react";
import { useState } from "react";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import Pagination from "../../../shared/components/ui/pagination";
import { Link } from "react-router";
import FormField from "../../../shared/components/forms/form_field";
import SearchInput from "../../../shared/components/forms/search_input";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import { button_styles } from "../../../shared/styles/button_styles";
import InventoryTable from "../components/inventory_table";
import useInventory from "../hooks/use_inventory";
import useInventoryFilters from "../hooks/use_inventory_filters";
import FilterChip from "../../../shared/components/ui/filter_chips";
import useDecommissionedInventory from "../hooks/use_inventory_decommission";

export default function InventoryPage() {
    const {
        items: inventory_items,
        is_loading,
        error,
        reload,
    } = useInventory();

    const { decommission_item, is_decommissioned } =
        useDecommissionedInventory();

    const active_items = inventory_items.filter(
        (item) => !is_decommissioned(item.part_UUID),
    );

    const {
        search,
        set_search,
        stock_filter,
        set_stock_filter,
        filtered_items,
        is_filtered,
        clear_filters,
    } = useInventoryFilters(active_items);

    const [sort_order, set_sort_order] = useState("name");
    const [pagination, set_pagination] = useState({ key: "", page: 1 });
    const results = [...filtered_items].sort((first, second) =>
        sort_order === "quantity"
            ? first.total_quantity - second.total_quantity ||
              first.part_name.localeCompare(second.part_name)
            : first.part_name.localeCompare(second.part_name),
    );
    const [page_size, set_page_size] = useState(5);
    const filter_key = JSON.stringify([
        search,
        stock_filter,
        sort_order,
        page_size,
    ]);
    const total_pages = Math.max(1, Math.ceil(results.length / page_size));
    const page =
        pagination.key === filter_key
            ? Math.min(pagination.page, total_pages)
            : 1;
    const visible_items = results.slice(
        (page - 1) * page_size,
        page * page_size,
    );
    const has_filters = is_filtered || stock_filter !== "";
    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <PageHeader
                title="Inventory"
                title_id="page_title"
                description="Find parts, check quantities, and review item records."
                actions={
                    <>
                        <Link
                            to="/inventory/decommissioned"
                            className={button_styles("secondary")}
                        >
                            <Archive size={18} aria-hidden="true" />
                            Decommissioned Parts
                        </Link>
                        <Link
                            to="/inventory/history"
                            className={button_styles("secondary")}
                        >
                            <History size={18} aria-hidden="true" />
                            Change History
                        </Link>
                        <Link to="/inventory/new" className={button_styles()}>
                            <Plus size={18} aria-hidden="true" />
                            Add Item
                        </Link>
                    </>
                }
            />

            <Card>
                <div className="mb-3 flex flex-wrap items-end gap-3">
                    <div className="min-w-0 flex-1 basis-64">
                        <p className="mb-2 text-sm font-medium text-slate-700">
                            Search inventory
                        </p>
                        <SearchInput
                            value={search}
                            on_change={set_search}
                            label="Search inventory"
                            placeholder="Item name or part number"
                        />
                    </div>

                    <div className="w-full sm:w-44">
                        <FormField id="stock_filter" label="Stock availability">
                            {(props) => (
                                <select
                                    {...props}
                                    value={stock_filter}
                                    onChange={(event) =>
                                        set_stock_filter(
                                            event.currentTarget.value,
                                        )
                                    }
                                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-2 focus:outline-red-600"
                                >
                                    <option value="">All stock</option>
                                    <option value="in_stock">In stock</option>
                                    <option value="out_of_stock">
                                        Out of stock
                                    </option>
                                </select>
                            )}
                        </FormField>
                    </div>
                    <div className="w-full sm:w-44">
                        <FormField id="inventory_sort" label="Sort by">
                            {(props) => (
                                <select
                                    {...props}
                                    value={sort_order}
                                    onChange={(event) =>
                                        set_sort_order(
                                            event.currentTarget.value,
                                        )
                                    }
                                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-2 focus:outline-red-600"
                                >
                                    <option value="name">
                                        Item name (A–Z)
                                    </option>
                                    <option value="quantity">
                                        Quantity (lowest first)
                                    </option>
                                </select>
                            )}
                        </FormField>
                    </div>
                </div>
                {has_filters && (
                    <div className="flex flex-wrap items-center gap-2 -mt-3">
                        {stock_filter && (
                            <FilterChip
                                label={`${stock_filter}`}
                                on_remove={() => set_stock_filter("")}
                            />
                        )}
                        <Button
                            variant="ghost"
                            onClick={() => {
                                clear_filters();
                                set_stock_filter("");
                            }}
                        >
                            Clear All Filters
                        </Button>
                    </div>
                )}

                <p role="status" className="mb-3 text-sm text-slate-500">
                    {is_loading
                        ? "Loading inventory…"
                        : error
                          ? "Inventory unavailable"
                          : results.length === 0
                            ? "No items shown"
                            : `Showing ${(page - 1) * page_size + 1}–${Math.min(page * page_size, results.length)} of ${results.length} items`}
                </p>
                {is_loading ? (
                    <ScreenLoading compact label="Loading inventory…" />
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
                    <InventoryTable
                        rows={visible_items}
                        is_filtered={has_filters}
                        on_decommission={decommission_item}
                    />
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        Rows per page
                        <select
                            aria-label="Rows per page"
                            value={page_size}
                            onChange={(event) =>
                                set_page_size(Number(event.currentTarget.value))
                            }
                            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 focus-visible:outline-2 focus-visible:outline-[#1d4ed8]"
                        >
                            {[5, 10, 25].map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </label>
                    <Pagination
                        page={page}
                        total_pages={total_pages}
                        on_page_change={(next_page) =>
                            set_pagination({ key: filter_key, page: next_page })
                        }
                    />
                </div>
            </Card>
        </section>
    );
}
