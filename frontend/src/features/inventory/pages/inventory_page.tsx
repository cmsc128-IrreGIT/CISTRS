import { History, Plus } from "lucide-react";
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

    return (
        <section aria-labelledby="page_title" className="space-y-6">
            <PageHeader
                title="Inventory"
                title_id="page_title"
                description="Aircraft parts and supplies."
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

                    {is_filtered && (
                        <Button variant="ghost" onClick={clear_filters}>
                            Clear filters
                        </Button>
                    )}
                </div>

                <p role="status" className="mb-3 text-sm text-slate-500">
                    {filtered_items.length} of {inventory_items.length} items
                    shown
                </p>

                <InventoryTable
                    rows={filtered_items}
                    is_filtered={is_filtered}
                />
            </Card>
        </section>
    );
}
