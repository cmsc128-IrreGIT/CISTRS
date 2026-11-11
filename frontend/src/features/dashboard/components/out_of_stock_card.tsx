import { Link } from "react-router";
import StatusBadge from "../../../shared/components/ui/status_badge";
import type { InventoryItem } from "../../inventory/types/inventory_types";
import { dashboard_list_limit } from "../config/dashboard_config";
import DashboardPanel from "./dashboard_panel";
import DashboardTable from "./dashboard_table";

export default function StockAlertsCard({ items }: { items: InventoryItem[] }) {
    return (
        <DashboardPanel
            title="Stock alerts"
            footer={{ label: "View inventory", to: "/inventory" }}
        >
            <DashboardTable
                caption="Stock alerts"
                headers={["Item", "Available", "Status"]}
                empty="No stock alerts."
                rows={items.slice(0, dashboard_list_limit).map((item) => ({
                    id: item.part_UUID,
                    cells: [
                        <Link
                            to={`/inventory/${item.part_UUID}`}
                            className="hover:underline"
                        >
                            {item.part_name}
                        </Link>,
                        `${item.total_quantity} ${item.unit_of_measure || (item.total_quantity === 1 ? "unit" : "units")}`,
                        <StatusBadge
                            tone={
                                item.total_quantity === 0 ? "danger" : "warning"
                            }
                        >
                            {item.total_quantity === 0
                                ? "Out of stock"
                                : "Low stock"}
                        </StatusBadge>,
                    ],
                }))}
            />
            {items.length > dashboard_list_limit && (
                <p className="mt-2 text-xs text-slate-600">
                    Showing {dashboard_list_limit} of {items.length} stock alerts
                </p>
            )}
        </DashboardPanel>
    );
}
