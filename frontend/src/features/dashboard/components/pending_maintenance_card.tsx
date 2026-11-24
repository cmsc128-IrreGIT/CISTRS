import { Link } from "react-router";
import StatusBadge from "../../../shared/components/ui/status_badge";
import type { PreviewRecord } from "../../../shared/types/record_types";
import DashboardDate from "./dashboard_date";
import DashboardOverflowText from "./dashboard_overflow_text";
import DashboardPanel from "./dashboard_panel";

const pending_tasks_path = "/maintenance?status=pending";

export default function PendingMaintenanceCard({
    maintenance,
    today = new Date(),
}: {
    maintenance: PreviewRecord[];
    today?: Date;
}) {
    const start_of_day = new Date(today);
    start_of_day.setHours(0, 0, 0, 0);
    const sorted = [...maintenance].sort((first, second) =>
        (first.due_date || "9999").localeCompare(second.due_date || "9999"),
    );
    return (
        <DashboardPanel
            title="Pending Maintenance"
            footer={{
                label: "View records",
                to: pending_tasks_path,
            }}
        >
            {sorted.length ? (
                <div
                    role="region"
                    aria-label="Pending maintenance list"
                    tabIndex={0}
                    className="thin-scrollbar dashboard-scroll rounded-md"
                >
                    <ul className="space-y-2">
                        {sorted.map((record) => {
                            const overdue =
                                new Date(`${record.due_date}T00:00:00`) <
                                start_of_day;
                            return (
                                <li
                                    key={record.id}
                                    className="rounded-md bg-[#f4f7fa] p-2.5"
                                >
                                    <div className="flex items-start gap-2">
                                        <Link
                                            to={`${pending_tasks_path}#record=${encodeURIComponent(record.id)}`}
                                            className="min-w-0 flex-1 text-sm font-semibold text-link"
                                            title={record.title}
                                        >
                                            <DashboardOverflowText
                                                text={record.title}
                                            />
                                        </Link>
                                        <StatusBadge
                                            tone={
                                                overdue
                                                    ? "danger"
                                                    : record.status
                                                      ? "info"
                                                      : "neutral"
                                            }
                                        >
                                            {overdue
                                                ? "Overdue"
                                                : record.status ||
                                                  "Not recorded"}
                                        </StatusBadge>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-600">
                                        {record.aircraft ||
                                            "Unassigned aircraft"}
                                    </p>
                                    <p
                                        className={`mt-1 text-sm ${overdue ? "text-red-700" : "text-slate-600"}`}
                                    >
                                        {record.due_date ? (
                                            <>
                                                Due:{" "}
                                                <DashboardDate
                                                    value={record.due_date}
                                                />
                                            </>
                                        ) : (
                                            "Due date not recorded"
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
