import { useEffect, useState } from "react";
import type { DonutChartEntry } from "../../../shared/components/charts/donut_chart";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import useActiveInventory from "../../inventory/hooks/use_active_inventory";
import { get_stock_status } from "../../inventory/utils/stock_status";
import useInventoryHistory from "../../inventory/hooks/use_inventory_history";
import useLogbook from "../../logbook/hooks/use_logbook";
import useMaintenance from "../../maintenance/hooks/use_maintenance";
import useAvailability from "../../personnel/hooks/use_availability";
import { list_personnel } from "../../personnel/services/personnel_service";

export default function useDashboardSummary(
    include_inventory = true,
    employee_id?: string,
) {
    const inventory = useActiveInventory(include_inventory);
    const transactions = useInventoryHistory(include_inventory);
    const aircraft = useAircraft();
    const maintenance = useMaintenance();
    const logbook = useLogbook();
    const availability = useAvailability();
    const [personnel_count, set_personnel_count] = useState(0);

    useEffect(() => {
        let cancelled = false;
        list_personnel()
            .then((personnel) => {
                if (!cancelled) set_personnel_count(personnel.length);
            })
            .catch(() => {
                if (!cancelled) set_personnel_count(0);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due_soon = new Date(today);
    due_soon.setDate(today.getDate() + 30);

    const stock_alerts = inventory.items
        .filter((item) => get_stock_status(item) !== "in_stock")
        .sort((first, second) => first.total_quantity - second.total_quantity);
    const pending_maintenance = maintenance.filter(
        (row) => row.status !== "Completed",
    );
    const completed_work = maintenance
        .filter((row) => row.status === "Completed")
        .sort((first, second) => second.due_date.localeCompare(first.due_date));
    const due_count = pending_maintenance.filter(
        (row) =>
            row.due_date && new Date(`${row.due_date}T00:00:00`) <= due_soon,
    ).length;
    const recent_changes = [...transactions.history].sort(
        (first, second) =>
            Date.parse(second.created_at) - Date.parse(first.created_at),
    );
    const recent_logbook = [...logbook].sort((first, second) =>
        second.entry_date.localeCompare(first.entry_date),
    );
    const current_availability = availability.records.find(
        (row) =>
            employee_id &&
            row.personnel === employee_id &&
            new Date(`${row.date}T00:00:00`).getTime() === today.getTime(),
    );
    const aircraft_status_data: DonutChartEntry[] = [
        { label: "Operational", value: 0, color: "#087443" },
        { label: "Maintenance", value: 0, color: "#d97706" },
        { label: "Out of service", value: 0, color: "#c92326" },
    ].map((entry) => ({
        ...entry,
        value: aircraft.filter(
            (row) => row.status.toLowerCase() === entry.label.toLowerCase(),
        ).length,
    }));

    return {
        inventory,
        transactions,
        personnel_count,
        stock_alerts,
        recent_changes,
        aircraft_count: aircraft.length,
        aircraft_status_data,
        pending_maintenance,
        completed_work,
        due_count,
        recent_logbook,
        current_availability,
        today,
    };
}
