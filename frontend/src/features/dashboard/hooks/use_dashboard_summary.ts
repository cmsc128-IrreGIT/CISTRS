import { useSyncExternalStore } from "react";
import type { DonutChartEntry } from "../../../shared/components/charts/donut_chart";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import useInventory from "../../inventory/hooks/use_inventory";
import useInventoryHistory from "../../inventory/hooks/use_inventory_history";
import useLogbook from "../../logbook/hooks/use_logbook";
import usePersonnel from "../../personnel/hooks/use_personnel";
import useMaintenance from "../../maintenance/hooks/use_maintenance";
import { availability_store } from "../../personnel/data/availability_store";

export default function useDashboardSummary(
  include_inventory = true,
  employee_id?: string,
) {
  const inventory = useInventory(include_inventory);
  const transactions = useInventoryHistory(include_inventory);
  const aircraft = useAircraft();
  const maintenance = useMaintenance();
  const logbook = useLogbook();
  const personnel = usePersonnel();
  const availability = useSyncExternalStore(
    availability_store.subscribe,
    availability_store.get_snapshot,
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due_soon = new Date(today);
  due_soon.setDate(today.getDate() + 30);

  const stock_alerts = inventory.items
    .filter((item) => item.total_quantity === 0 || item.is_low_stock)
    .sort((first, second) => first.total_quantity - second.total_quantity);
  const pending_maintenance = maintenance.filter(
    (row) => row.status !== "Completed",
  );
  const completed_work = maintenance
    .filter((row) => row.status === "Completed")
    .sort((first, second) => second.due_date.localeCompare(first.due_date));
  const due_count = pending_maintenance.filter(
    (row) => row.due_date && new Date(`${row.due_date}T00:00:00`) <= due_soon,
  ).length;
  const recent_changes = [...transactions.history].sort(
    (first, second) =>
      Date.parse(second.created_at) - Date.parse(first.created_at),
  );
  const recent_logbook = [...logbook].sort((first, second) =>
    second.entry_date.localeCompare(first.entry_date),
  );
  const current_availability = availability.find(
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
    personnel_count: personnel.length,
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
