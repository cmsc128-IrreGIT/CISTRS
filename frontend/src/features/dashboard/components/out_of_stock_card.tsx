import { Package } from "lucide-react";
import { Link } from "react-router";
import EmptyState from "../../../shared/components/feedback/empty_state";
import Card from "../../../shared/components/ui/card";
import StatusBadge from "../../../shared/components/ui/status_badge";
import type { InventoryItem } from "../../inventory/types/inventory_types";
import { dashboard_list_limit } from "../config/dashboard_config";

type OutOfStockCardProps = {
    items: InventoryItem[];
};

export default function OutOfStockCard({ items }: OutOfStockCardProps) {
    const visible_items = items.slice(0, dashboard_list_limit);

    return (
        <Card
            title="Out-of-stock Items"
            action={
                <Link
                    to="/inventory"
                    className="rounded-sm text-sm font-medium text-slate-600 underline underline-offset-4 decoration-slate-300 hover:text-[#0b2238] hover:decoration-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
                >
                    View inventory
                </Link>
            }
        >
            {items.length === 0 ? (
                <EmptyState
                    title="No out-of-stock items"
                    description="All current inventory records have a quantity above zero."
                    icon={Package}
                />
            ) : (
                <ul className="divide-y divide-slate-100">
                    {visible_items.map((item) => (
                        <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <Link
                                        to={`/inventory/${item.id}`}
                                        className="font-medium text-slate-900 hover:underline"
                                    >
                                        {item.name}
                                    </Link>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {item.part_number} ·{" "}
                                        {item.aircraft ?? "Unassigned"}
                                    </p>
                                </div>

                                <StatusBadge tone="danger">
                                    Out of stock
                                </StatusBadge>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {items.length > dashboard_list_limit && (
                <p className="mt-4 text-xs text-slate-500">
                    Showing {visible_items.length} of {items.length}{" "}
                    out-of-stock items.
                </p>
            )}
        </Card>
    );
}
