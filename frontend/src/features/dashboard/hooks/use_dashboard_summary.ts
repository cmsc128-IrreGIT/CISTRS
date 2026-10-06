import { Bell, Package, PackageX, Wrench } from "lucide-react";
import type { DonutChartEntry } from "../../../shared/components/charts/donut_chart";
import useInventory from "../../inventory/hooks/use_inventory";
import useInventoryHistory from "../../inventory/hooks/use_inventory_history";
import { dashboard_list_limit } from "../config/dashboard_config";

export default function useDashboardSummary() {
    const inventory_items = useInventory();
    const inventory_history = useInventoryHistory();

    const out_of_stock = inventory_items.filter((item) => item.quantity === 0);
    const recent_changes = inventory_history.slice(0, dashboard_list_limit);

    const aircraft_status_data: DonutChartEntry[] = [
        { label: "Operational", value: 2, color: "#15803d" },
        { label: "Maintenance", value: 1, color: "#d97706" },
        { label: "Out of Service", value: 1, color: "#dc2626" },
    ];

    const summaries = [
        {
            label: "Inventory Items",
            value: inventory_items.length,
            description: "Item records",
            icon: Package,
        },
        {
            label: "Low Stock",
            value: "—",
            description: "Thresholds pending",
            icon: PackageX,
        },
        {
            label: "Upcoming Maintenance",
            value: "—",
            description: "Coming soon",
            icon: Wrench,
        },
        {
            label: "Active Alerts",
            value: "—",
            description: "Coming soon",
            icon: Bell,
        },
    ];

    return {
        summaries,
        out_of_stock,
        recent_changes,
        aircraft_status_data,
    };
}