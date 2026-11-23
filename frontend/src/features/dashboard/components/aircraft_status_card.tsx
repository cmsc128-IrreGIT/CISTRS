import DonutChart from "../../../shared/components/charts/donut_chart";
import type { DonutChartEntry } from "../../../shared/components/charts/donut_chart";
import DashboardPanel from "./dashboard_panel";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import Button from "../../../shared/components/ui/button";

export default function AircraftStatusCard({
  data,
  loading = false,
  error = "",
  on_retry,
}: {
  data: DonutChartEntry[];
  loading?: boolean;
  error?: string;
  on_retry?: () => void;
}) {
  return (
    <DashboardPanel
      title="Aircraft status"
      footer={{ label: "View aircraft", to: "/aircraft" }}
    >
      {loading ? <ScreenLoading compact label="Loading aircraft..." /> : error ? <div role="alert"><p className="text-sm text-red-700">{error}</p><Button variant="ghost" onClick={on_retry}>Retry aircraft</Button></div> : data.some((entry) => entry.value > 0) ? (
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
