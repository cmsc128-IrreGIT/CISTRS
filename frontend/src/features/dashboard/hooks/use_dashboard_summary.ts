import type { DonutChartEntry } from "../../../shared/components/charts/donut_chart";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import useActiveInventory from "../../inventory/hooks/use_active_inventory";
import { get_stock_status } from "../../inventory/utils/stock_status";
import useInventoryHistory from "../../inventory/hooks/use_inventory_history";
import useLogbook from "../../logbook/hooks/use_logbook";
import usePersonnel from "../../personnel/hooks/use_personnel";
import useMaintenanceRecords from "../../maintenance/hooks/use_maintenance_records";
import { maintenance_summary } from "../../maintenance/utils/maintenance_summary";
import { useAuth } from "../../auth/hooks/auth_context";
import useAvailability from "../../personnel/hooks/use_availability";

export default function useDashboardSummary(
  include_inventory = true,
  employee_id?: string,
) {
  const inventory = useActiveInventory(include_inventory);
  const transactions = useInventoryHistory(include_inventory);
  const aircraft = useAircraft();
  const { user } = useAuth();
  const maintenance_state = useMaintenanceRecords(Boolean(user?.features.includes("Maintenance")));
  const maintenance = [...maintenance_state.ads, ...maintenance_state.tasks].map(maintenance_summary);
  const logbook = useLogbook();
  const personnel = usePersonnel();
  const availability = useAvailability();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due_soon = new Date(today);
  due_soon.setDate(today.getDate() + 30);

  const stock_alerts = inventory.items
    .filter((item) => get_stock_status(item) !== "in_stock")
    .sort((first, second) => first.total_quantity - second.total_quantity);
  const pending_maintenance = maintenance.filter(
    (row) => Boolean(row.due_date) || row.due_hours !== null,
  );
  const completed_work = maintenance
    .filter((row) => Boolean(row.accomplished_date))
    .sort((first, second) => second.accomplished_date.localeCompare(first.accomplished_date));
  const due_count = pending_maintenance.filter(
    (row) => row.overdue || (row.due_date && new Date(`${row.due_date}T00:00:00`) <= due_soon),
  ).length;
  const recent_changes = [...transactions.history].sort(
    (first, second) =>
      Date.parse(second.created_at) - Date.parse(first.created_at),
  );
  const recent_logbook = [...logbook].sort((first, second) =>
    second.flight_date.localeCompare(first.flight_date),
  );
  const current_availability = availability.find(
    (row) =>
      employee_id &&
      row.personnel === employee_id &&
      new Date(`${row.date}T00:00:00`).getTime() === today.getTime(),
  );
  const status_names = [...new Set(["Airworthy", "In Maintenance", "AOG", ...aircraft.map((row) => row.status.status_name)])];
  const aircraft_status_data: DonutChartEntry[] = status_names.map((label) => {
    const status = label.toLowerCase();
    const color = status === "airworthy" || status === "operational" ? "#087443"
      : status.includes("maintenance") ? "#d97706"
      : status === "aog" || status.includes("out of service") || status.includes("unairworthy") ? "#c92326" : "#64748b";
    return { label, color, value: aircraft.filter((row) => row.status.status_name === label).length };
  });

  return {
    inventory,
    transactions,
    personnel_count: personnel.length,
    stock_alerts,
    recent_changes,
    aircraft_count: aircraft.length,
    aircraft_status_data,
    pending_maintenance,
    maintenance_state,
    completed_work,
    due_count,
    recent_logbook,
    current_availability,
    today,
  };
}
