import { Link } from "react-router";
import StatusBadge from "../../../shared/components/ui/status_badge";
import type { MaintenanceSummaryRecord } from "../../maintenance/utils/maintenance_summary";
import Button from "../../../shared/components/ui/button";
import DashboardDate from "./dashboard_date";
import DashboardOverflowText from "./dashboard_overflow_text";
import DashboardPanel from "./dashboard_panel";

const pending_tasks_path = "/maintenance";

export default function PendingMaintenanceCard({
  maintenance,
  loading = false,
  error = "",
  on_retry,
}: {
  maintenance: MaintenanceSummaryRecord[];
  loading?: boolean;
  error?: string;
  on_retry?: () => void;
}) {
  const sorted = [...maintenance].sort((first, second) =>
    Number(second.overdue) - Number(first.overdue) || (first.due_date || "9999").localeCompare(second.due_date || "9999"),
  );
  return (
    <DashboardPanel
      title="Pending Maintenance"
      footer={{
        label: "View records",
        to: pending_tasks_path,
      }}
    >
      {loading ? <p className="text-sm text-slate-600">Loading maintenance...</p> : error ? <div role="alert"><p className="text-sm text-red-700">{error}</p><Button variant="ghost" onClick={on_retry}>Retry maintenance</Button></div> : sorted.length ? (
        <div role="region" aria-label="Pending maintenance list" tabIndex={0} className="thin-scrollbar dashboard-scroll rounded-md">
          <ul className="space-y-2">
            {sorted.map((record) => {
              const overdue = record.overdue;
              return (
                <li key={record.id} className="rounded-md bg-[#f4f7fa] p-2.5">
                  <div className="flex items-start gap-2">
                    <Link
                      to={`/maintenance/${record.id}`}
                      className="min-w-0 flex-1 text-sm font-semibold text-link"
                      title={record.title}
                    >
                      <DashboardOverflowText text={record.title} />
                    </Link>
                    <StatusBadge
                      tone={
                        overdue ? "danger" : record.status === "Current" ? "success" : "neutral"
                      }
                    >
                      {overdue ? "Overdue" : record.status || "Not recorded"}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {record.aircraft || "Unassigned aircraft"}
                  </p>
                  <p
                    className={`mt-1 text-sm ${overdue ? "text-red-700" : "text-slate-600"}`}
                  >
                    {record.due_date ? (
                      <>
                        Due: <DashboardDate value={record.due_date} />
                      </>
                    ) : (
                      record.due_hours !== null ? `Due at ${record.due_hours} aircraft hours` : "Due date not recorded"
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="py-2 text-sm text-slate-600">
          No pending maintenance records.
        </p>
      )}
    </DashboardPanel>
  );
}
