import { Bell, Package, PackageX, Wrench } from "lucide-react";
import type { DonutChartEntry } from "../../../shared/components/charts/donut_chart";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import useInventory from "../../inventory/hooks/use_inventory";
import useInventoryHistory from "../../inventory/hooks/use_inventory_history";
import useMaintenance from "../../maintenance/hooks/use_maintenance";
import useNotifications from "../../notifications/hooks/use_notifications";
import { dashboard_list_limit } from "../config/dashboard_config";

export default function useDashboardSummary() {
    const inventory = useInventory();
    const inventory_items = inventory.items;
    const transactions = useInventoryHistory();
    const inventory_history = transactions.history;
    const aircraft = useAircraft();
    const maintenance = useMaintenance();
    const notifications = useNotifications();

    const out_of_stock = inventory_items.filter(
        (item) => item.total_quantity === 0,
    );
    const recent_changes = [...inventory_history]
        .sort(
            (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
        )
        .slice(0, dashboard_list_limit);

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
            value: inventory.is_loading
                ? "Loading…"
                : inventory.error
                  ? "Unavailable"
                  : inventory_items.length,
            description: "Item records",
            icon: Package,
        },
        {
            label: "Low Stock",
            value: inventory.is_loading
                ? "Loading…"
                : inventory.error
                  ? "Unavailable"
                  : inventory_items.filter((item) => item.is_low_stock).length,
            description: "Below configured stock thresholds",
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
        inventory_loading: inventory.is_loading,
        inventory_error: inventory.error,
        reload_inventory: inventory.reload,
        history_loading: transactions.is_loading,
        history_error: transactions.error,
        reload_history: transactions.reload,
        summaries,
        out_of_stock,
        recent_changes,
        aircraft_status_data,
        pending_maintenance,
    };
}
