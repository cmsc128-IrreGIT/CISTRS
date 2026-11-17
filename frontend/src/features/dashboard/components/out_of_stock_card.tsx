import { Link } from "react-router";
import StatusBadge from "../../../shared/components/ui/status_badge";
import type { InventoryItem } from "../../inventory/types/inventory_types";
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
                scroll
                headers={["Item", "Available", "Status"]}
                empty="No stock alerts."
                rows={items.map((item) => ({
                    id: item.part_UUID,
                    cells: [
                        <Link
                            to={`/inventory/${item.part_UUID}`}
                            className="text-link"
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
        </DashboardPanel>
    );
}
