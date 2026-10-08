import { Bell, Package, PackageX, Wrench } from "lucide-react";
import type { DonutChartEntry } from "../../../shared/components/charts/donut_chart";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import useInventory from "../../inventory/hooks/use_inventory";
import useInventoryHistory from "../../inventory/hooks/use_inventory_history";
import useMaintenance from "../../maintenance/hooks/use_maintenance";
import useNotifications from "../../notifications/hooks/use_notifications";
import { dashboard_list_limit } from "../config/dashboard_config";

export default function useDashboardSummary() {
    const inventory_items = useInventory();
    const inventory_history = useInventoryHistory();
    const aircraft = useAircraft();
    const maintenance = useMaintenance();
    const notifications = useNotifications();

    const out_of_stock = inventory_items.filter((item) => item.quantity === 0);
    const recent_changes = inventory_history.slice(0, dashboard_list_limit);

    const pending_maintenance = maintenance
        .filter((record) => record.status !== "Completed")
        .sort((first, second) => first.due_date.localeCompare(second.due_date));

    const aircraft_status_data: DonutChartEntry[] = [
        {
            label: "Operational",
            value: aircraft.filter((record) => record.status === "Operational")
                .length,
            color: "#15803d",
        },
        {
            label: "Maintenance",
            value: aircraft.filter((record) => record.status === "Maintenance")
                .length,
            color: "#d97706",
        },
        {
            label: "Out of Service",
            value: aircraft.filter(
                (record) => record.status === "Out of Service",
            ).length,
            color: "#dc2626",
        },
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
            label: "Pending Maintenance",
            value: pending_maintenance.length,
            description: "Open preview tasks",
            icon: Wrench,
        },
        {
            label: "Unread Alerts",
            value: notifications.filter((record) => record.read_at === null)
                .length,
            description: "Sample notifications",
            icon: Bell,
        },
    ];

    return {
        summaries,
        out_of_stock,
        recent_changes,
        aircraft_status_data,
        pending_maintenance,
    };
}
