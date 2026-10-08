import { History, Plus } from "lucide-react";
import { useState } from "react";
import Pagination from "../../../shared/components/ui/pagination";
import { Link } from "react-router";
import PreviewNotice from "../../../shared/components/feedback/preview_notice";
import FormField from "../../../shared/components/forms/form_field";
import SearchInput from "../../../shared/components/forms/search_input";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import { button_styles } from "../../../shared/styles/button_styles";
import InventoryTable from "../components/inventory_table";
import useInventory from "../hooks/use_inventory";
import useInventoryFilters from "../hooks/use_inventory_filters";

export default function InventoryPage() {
    const inventory_items = useInventory();
    const {
        search,
        set_search,
        aircraft_filter,
        set_aircraft_filter,
        aircraft_options,
        filtered_items,
        is_filtered,
        clear_filters,
    } = useInventoryFilters(inventory_items);

    const [stock_filter, set_stock_filter] = useState("");
    const [sort_order, set_sort_order] = useState("name");
    const [pagination, set_pagination] = useState({ key: "", page: 1 });
    const results = filtered_items.filter((item) => stock_filter === "" ||
        (stock_filter === "in_stock" ? item.quantity > 0 : item.quantity === 0))
        .sort((first, second) => sort_order === "quantity"
            ? first.quantity - second.quantity || first.name.localeCompare(second.name)
            : first.name.localeCompare(second.name));
    const page_size = 10;
    const filter_key = JSON.stringify([search, aircraft_filter, stock_filter, sort_order]);
    const total_pages = Math.max(1, Math.ceil(results.length / page_size));
    const page = pagination.key === filter_key ? Math.min(pagination.page, total_pages) : 1;
    const visible_items = results.slice((page - 1) * page_size, page * page_size);
    const has_filters = is_filtered || stock_filter !== "";

    return (
        <section aria-labelledby="page_title" className="space-y-6">
            <PageHeader
                title="Inventory"
                title_id="page_title"
                description="Find parts, check quantities, and review item records."
                actions={
                    <>
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

            <PreviewNotice />

            <Card>
                <div className="mb-5 flex flex-wrap items-end gap-4">
                    <div className="min-w-0 flex-1 basis-64">
                        <p className="mb-2 text-sm font-medium text-slate-700">
                            Search inventory
                        </p>
                        <SearchInput
                            value={search}
                            on_change={set_search}
                            label="Search inventory"
                            placeholder="Item name, part number, or category"
                        />
                    </div>

                    <div className="w-full sm:w-52">
                        <FormField id="aircraft_filter" label="Aircraft">
                            {(field_props) => (
                                <select
                                    {...field_props}
                                    value={aircraft_filter}
                                    onChange={(event) =>
                                        set_aircraft_filter(
                                            event.currentTarget.value,
                                        )
                                    }
                                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-2 focus:outline-red-600"
                                >
                                    <option value="">All aircraft</option>
                                    <option value="unassigned">
                                        Unassigned
                                    </option>
                                    {aircraft_options.map((aircraft) => (
                                        <option key={aircraft} value={aircraft}>
                                            {aircraft}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </FormField>
                    </div>

                    <div className="w-full sm:w-44">
                        <FormField id="stock_filter" label="Stock availability">
                            {(props) => <select {...props} value={stock_filter} onChange={(event) => set_stock_filter(event.currentTarget.value)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-2 focus:outline-red-600">
                                <option value="">All stock</option>
                                <option value="in_stock">In stock</option>
                                <option value="out_of_stock">Out of stock</option>
                            </select>}
                        </FormField>
                    </div>
                    <div className="w-full sm:w-44">
                        <FormField id="inventory_sort" label="Sort by">
                            {(props) => <select {...props} value={sort_order} onChange={(event) => set_sort_order(event.currentTarget.value)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-2 focus:outline-red-600">
                                <option value="name">Item name (A–Z)</option>
                                <option value="quantity">Quantity (lowest first)</option>
                            </select>}
                        </FormField>
                    </div>
                    {has_filters && (
                        <Button variant="ghost" onClick={() => { clear_filters(); set_stock_filter(""); }}>
                            Clear filters
                        </Button>
                    )}
                </div>

                <p role="status" className="mb-3 text-sm text-slate-500">
                    {results.length === 0 ? "No items shown" : `Showing ${(page - 1) * page_size + 1}–${Math.min(page * page_size, results.length)} of ${results.length} items`}
                </p>

                <InventoryTable
                    rows={visible_items}
                    is_filtered={has_filters}
                />
                <div className="mt-4">
                    <Pagination page={page} total_pages={total_pages} on_page_change={(next_page) => set_pagination({ key: filter_key, page: next_page })} />
                </div>
            </Card>
        </section>
    );
}
