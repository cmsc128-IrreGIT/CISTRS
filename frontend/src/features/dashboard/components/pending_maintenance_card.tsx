import { Link } from "react-router";
import StatusBadge from "../../../shared/components/ui/status_badge";
import type { PreviewRecord } from "../../../shared/types/record_types";
import { dashboard_list_limit } from "../config/dashboard_config";
import DashboardDate from "./dashboard_date";
import DashboardPanel from "./dashboard_panel";

export default function PendingMaintenanceCard({
  maintenance,
  today = new Date(),
}: {
  maintenance: PreviewRecord[];
  today?: Date;
}) {
  const start_of_day = new Date(today);
  start_of_day.setHours(0, 0, 0, 0);
  const visible = [...maintenance]
    .sort((first, second) =>
      (first.due_date || "9999").localeCompare(second.due_date || "9999"),
    )
    .slice(0, dashboard_list_limit);
  return (
    <DashboardPanel
      title="Pending Maintenance"
      sample
      footer={{
        label: "View records",
        to: "/maintenance?status=pending",
      }}
    >
      {visible.length ? (
        <ul className="space-y-2">
          {visible.map((record) => {
            const overdue =
              new Date(`${record.due_date}T00:00:00`) < start_of_day;
            return (
              <li key={record.id} className="rounded-md bg-[#f4f7fa] p-2.5">
                <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                  <Link
                    to={`/maintenance/${record.id}`}
                    className="text-sm font-semibold wrap-break-word hover:underline"
                  >
                    {record.title}
                  </Link>
                  <StatusBadge
                    tone={
                      overdue ? "danger" : record.status ? "info" : "neutral"
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
                    "Due date not recorded"
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-2 text-sm text-slate-600">
          No pending maintenance records.
        </p>
      )}
      {maintenance.length > visible.length && (
        <p className="mt-2 text-xs text-slate-600">
          Showing {visible.length} of {maintenance.length} pending items
        </p>
      )}
    </DashboardPanel>
  );
}
