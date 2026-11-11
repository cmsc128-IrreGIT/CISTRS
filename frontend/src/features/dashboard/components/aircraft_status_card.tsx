import DonutChart from "../../../shared/components/charts/donut_chart";
import type { DonutChartEntry } from "../../../shared/components/charts/donut_chart";
import DashboardPanel from "./dashboard_panel";

export default function AircraftStatusCard({
  data,
}: {
  data: DonutChartEntry[];
}) {
  return (
    <DashboardPanel
      title="Aircraft status"
      sample
      footer={{ label: "View aircraft", to: "/aircraft" }}
    >
      {data.some((entry) => entry.value > 0) ? (
        <div className="dashboard-aircraft">
          <DonutChart data={data} label="Aircraft counts by status" compact />
        </div>
      ) : (
        <p className="py-2 text-sm text-slate-600">
          No aircraft status data yet.
        </p>
      )}
    </DashboardPanel>
  );
}
