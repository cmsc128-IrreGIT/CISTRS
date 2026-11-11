import type { ReactNode } from "react";
import FormField from "../../../shared/components/forms/form_field";
import SearchInput from "../../../shared/components/forms/search_input";
import type { InventoryItem } from "../types/inventory_types";
import type useInventoryFilters from "../hooks/use_inventory_filters";

import {
    STOCK_FILTER_LABELS,
    INVENTORY_FILTER_SELECT,
} from "../constants/inventory_constants";

export default function InventoryListFilters({
    items,
    filters,
    action,
    show_category = true,
}: {
    items: InventoryItem[];
    filters: ReturnType<typeof useInventoryFilters>;
    action?: ReactNode;
    show_category?: boolean;
}) {
    const locations = [
        ...new Map(
            items.flatMap((item) =>
                (item.locations ?? []).map(
                    (entry) =>
                        [entry.location_UUID, entry.location_name] as const,
                ),
            ),
        ),
    ].sort((first, second) => first[1].localeCompare(second[1]));

    return (
        <div className="mb-5 flex flex-wrap items-end gap-3 rounded-md bg-[#f5f8fa] p-4">
            <div className="min-w-0 flex-[2_1_13rem]">
                <p className="mb-1 text-sm font-medium text-[#0b2238]">
                    Search inventory
                </p>
                <SearchInput
                    value={filters.search}
                    on_change={filters.set_search}
                    label="Search inventory"
                    placeholder="Item or part number"
                />
            </div>
            {show_category && filters.categories.length > 0 && (
                <div className="min-w-0 flex-[1_1_8rem]">
                    <FormField id="inventory_category" label="Category">
                        {(props) => (
                            <select
                                {...props}
                                className={INVENTORY_FILTER_SELECT}
                                value={filters.category}
                                onChange={(event) =>
                                    filters.set_category(
                                        event.currentTarget.value,
                                    )
                                }
                            >
                                <option value="">All categories</option>
                                {filters.categories.map((category) => (
                                    <option key={category}>{category}</option>
                                ))}
                            </select>
                        )}
                    </FormField>
                </div>
            )}
            <div className="min-w-0 flex-[1_1_8rem]">
                <FormField id="inventory_location" label="Location">
                    {(props) => (
                        <select
                            {...props}
                            className={INVENTORY_FILTER_SELECT}
                            value={filters.location}
                            onChange={(event) =>
                                filters.set_location(event.currentTarget.value)
                            }
                        >
                            <option value="">All locations</option>
                            {locations.map(([id, label]) => (
                                <option key={id} value={id}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    )}
                </FormField>
            </div>
            <div className="min-w-0 flex-[1_1_8rem]">
                <FormField id="stock_filter" label="Stock status">
                    {(props) => (
                        <select
                            {...props}
                            className={INVENTORY_FILTER_SELECT}
                            value={filters.stock_filter}
                            onChange={(event) =>
                                filters.set_stock_filter(
                                    event.currentTarget.value,
                                )
                            }
                        >
                            <option value="">All statuses</option>
                            {Object.entries(STOCK_FILTER_LABELS).map(
                                ([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ),
                            )}
                        </select>
                    )}
                </FormField>
            </div>
            {action}
        </div>
    );
}
