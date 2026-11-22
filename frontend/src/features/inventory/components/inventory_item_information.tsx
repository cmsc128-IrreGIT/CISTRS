import { Package } from "lucide-react";
import DetailsList from "../../../shared/components/ui/details_list";
import type { InventoryItem } from "../types/inventory_types";
import { format_inventory_expiry } from "../utils/inventory_dates";

export default function InventoryItemInformation({
    item,
}: {
    item: InventoryItem;
}) {
    return (
        <div className="grid gap-5 lg:grid-cols-[minmax(9rem,1fr)_3fr]">
            <div className="space-y-3">
                <div className="flex aspect-square max-w-48 flex-col items-center justify-center gap-2 rounded-lg bg-slate-100 p-4 text-sm text-slate-600">
                    <Package size={28} aria-hidden="true" />
                    <p>No item photo</p>
                </div>
                <p className="text-sm text-slate-500">Description</p>
                <p className="break-words text-sm text-slate-800">
                    {item.description?.trim() || "No description recorded"}
                </p>
            </div>
            <div className="min-w-0">
                <DetailsList
                    entries={[
                        {
                            id: "part_number",
                            label: "Part number",
                            value: item.part_number,
                        },
                        {
                            id: "category",
                            label: "Category",
                            value: item.category?.trim() || "Not recorded",
                        },
                        {
                            id: "unit",
                            label: "Unit of measure",
                            value: item.unit_of_measure,
                        },
                        {
                            id: "minimum",
                            label: "Minimum stock level",
                            value: `${item.min_stock_level} ${item.unit_of_measure}`,
                        },
                        {
                            id: "supplier",
                            label: "Supplier",
                            value: item.suppliers.join(", ") || "Not recorded",
                        },
                        {
                            id: "manufacturer",
                            label: "Manufacturer",
                            value: item.manufacturers.join(", ") || "Not recorded",
                        },
                        {
                            id: "locations",
                            label: "Inventory location",
                            value: item.locations.length ? (
                                <ul role="list" className="space-y-1.5">
                                    {item.locations.map(
                                        ({ status_UUID, location_name, storage_area }) => (
                                            <li key={status_UUID}>
                                                {location_name}
                                                {storage_area && (
                                                    <span className="text-sm text-slate-600">
                                                        {" · "}
                                                        {storage_area}
                                                    </span>
                                                )}
                                            </li>
                                        ),
                                    )}
                                </ul>
                            ) : (
                                "Not recorded"
                            ),
                        },
                        {
                            id: "expiry",
                            label: "Expiry",
                            value: format_inventory_expiry(item),
                        },
                    ]}
                />
            </div>
        </div>
    );
}
