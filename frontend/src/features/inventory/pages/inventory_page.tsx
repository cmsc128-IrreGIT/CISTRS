import { Plus } from "lucide-react";
import { useContext } from "react";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import Pagination from "../../../shared/components/ui/pagination";
import { Link, Outlet, useLocation, useSearchParams } from "react-router";
import { AuthContext } from "../../auth/hooks/auth_context";
import { get_inventory_access } from "../../../shared/components/navigation/workspace";
import InventoryListFilters from "../components/inventory_list_filters";
import {
    InventoryBreadcrumbs,
    InventoryTabs,
} from "../components/inventory_workspace";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import { button_styles } from "../../../shared/styles/button_styles";
import InventoryTable from "../components/inventory_table";
import useActiveInventory from "../hooks/use_active_inventory";
import useInventoryFilters from "../hooks/use_inventory_filters";

import {
    INVENTORY_PRIMARY_ACTION,
    STOCK_FILTER_LABELS,
    STOCK_FILTER_PARAM,
} from "../constants/inventory_constants";

export default function InventoryPage() {
    const inventory = useActiveInventory();
    const { items: active_items, all_items, is_loading, error, reload } = inventory;
    const { search: location_search } = useLocation();

    const read_only =
        get_inventory_access(useContext(AuthContext)?.user ?? null) === "read";
    const [params, set_params] = useSearchParams();
    const requested_stock = params.get(STOCK_FILTER_PARAM) ?? "";
    const stock_filter = Object.hasOwn(STOCK_FILTER_LABELS, requested_stock)
        ? requested_stock
        : "";
    function set_stock_filter(value: string) {
        const next = new URLSearchParams(params);
        if (value) next.set(STOCK_FILTER_PARAM, value);
        else next.delete(STOCK_FILTER_PARAM);
        set_params(next, { replace: true });
    }

    const filters = useInventoryFilters(
        active_items,
        stock_filter,
        set_stock_filter,
    );
    const {
        search,
        category,
        location,
        filtered_items,
        is_filtered,
        clear_filters,
    } = filters;

    const results = (
        read_only
            ? active_items.filter((item) => item.total_quantity > 0)
            : [...filtered_items]
    ).sort((first, second) => first.part_name.localeCompare(second.part_name));
    const { visible_rows, footer } = useTablePagination(
        results,
        JSON.stringify([search, stock_filter, category, location]),
    );
    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <InventoryBreadcrumbs read_only={read_only} />
            <h1 id="page_title" className="sr-only">
                {read_only ? "Stock availability" : "Inventory"}
            </h1>
            <Card>
                {read_only ? (
                    <h2 className="mb-5 font-semibold text-[#0b2238]">
                        Parts available
                    </h2>
                ) : (
                    <>
                        <InventoryTabs />
                        <InventoryListFilters
                            items={active_items}
                            filters={filters}
                            action={
                                <div className="flex flex-wrap gap-2">
                                    {is_filtered && (
                                        <Button
                                            variant="ghost"
                                            onClick={clear_filters}
                                        >
                                            Clear filters
                                        </Button>
                                    )}
                                    <Link
                                        to={{ pathname: "new", search: location_search }}
                                        state={{ from_inventory: true }}
                                        className={button_styles(
                                            "primary",
                                            INVENTORY_PRIMARY_ACTION,
                                        )}
                                    >
                                        <Plus size={17} aria-hidden="true" />{" "}
                                        Add item
                                    </Link>
                                </div>
                            }
                        />
                    </>
                )}
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
                        rows={read_only ? results : visible_rows}
                        is_filtered={is_filtered && !read_only}
                        show_category={filters.categories.length > 0}
                        read_only={read_only}
                    />
                )}
                {!read_only && !is_loading && !error && (
                    <Pagination {...footer} item_label="item" />
                )}
            </Card>
            {!read_only && (
                <p className="text-sm text-slate-600">
                    Receive stock adds quantity. Issue stock deducts quantity.
                    Stock availability does not authorize aircraft use.
                </p>
            )}
            <Outlet context={{ ...inventory, items: all_items }} />
        </section>
    );
}
