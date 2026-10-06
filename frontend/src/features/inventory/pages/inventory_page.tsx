import { History, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import FormField from "../../../shared/components/forms/form_field";
import SearchInput from "../../../shared/components/forms/search_input";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import { button_styles } from "../../../shared/styles/button_styles";
import InventoryTable from "../components/inventory_table";
import useInventory from "../hooks/use_inventory";

export default function InventoryPage() {
    const inventory_items = useInventory();
    const [search, set_search] = useState("");
    const [aircraft_filter, set_aircraft_filter] = useState("");

    const aircraft_options = Array.from(
        new Set(
            inventory_items
                .map((item) => item.aircraft)
                .filter((aircraft): aircraft is string => aircraft !== null),
        ),
    );

    const search_term = search.trim().toLowerCase();
    const is_filtered = search_term !== "" || aircraft_filter !== "";

    const filtered_items = inventory_items.filter((item) => {
        const matches_search = [item.name, item.part_number, item.category]
            .some((value) => value.toLowerCase().includes(search_term));

        const matches_aircraft = aircraft_filter === "" ||
            (aircraft_filter === "unassigned"
                ? item.aircraft === null
                : item.aircraft === aircraft_filter);

        return matches_search && matches_aircraft;
    });

    function clear_filters() {
        set_search("");
        set_aircraft_filter("");
    }

    return (
        <section aria-labelledby="page_title" className="space-y-6">
            <PageHeader
                title="Inventory"
                title_id="page_title"
                description="Aircraft parts and supplies."
                actions={
                    <>
                        <Link to="/inventory/history" className={button_styles("secondary")}>
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

            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Preview records only. Records and history reset on refresh.
            </p>

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
                                    onChange={(event) => set_aircraft_filter(event.currentTarget.value)}
                                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-2 focus:outline-red-600"
                                >
                                    <option value="">All aircraft</option>
                                    <option value="unassigned">Unassigned</option>
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
                    {filtered_items.length} of {inventory_items.length} items shown
                </p>

                <InventoryTable rows={filtered_items} is_filtered={is_filtered} />
            </Card>
        </section>
    );
}