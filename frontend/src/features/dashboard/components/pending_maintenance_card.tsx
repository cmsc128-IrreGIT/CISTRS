import { CalendarDays, Wrench } from "lucide-react";
import { Link } from "react-router";
import Card from "../../../shared/components/ui/card";
import StatusBadge from "../../../shared/components/ui/status_badge";
import type { PreviewRecord } from "../../../shared/types/record_types";
import { dashboard_list_limit } from "../config/dashboard_config";

type PendingMaintenanceCardProps = {
    maintenance: PreviewRecord[];
};

const link_style =
    "rounded-sm text-sm font-medium text-slate-600 underline underline-offset-4 decoration-slate-300 hover:text-[#0b2238] hover:decoration-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600";

export default function PendingMaintenanceCard({
    maintenance,
}: PendingMaintenanceCardProps) {
    const visible = maintenance.slice(0, Math.min(2, dashboard_list_limit));

    return (
        <Card
            compact
            className="h-full"
            title="Pending Maintenance"
            action={
                <Link to="/maintenance?status=pending" className={link_style}>
                    View records
                </Link>
            }
        >
            {visible.length > 0 ? (
                <>
                    <p className="mb-3 text-xs text-slate-500">
                        {maintenance.length} pending{" "}
                        {maintenance.length === 1 ? "task" : "tasks"}
                        {maintenance.length > visible.length
                            ? ` · Showing ${visible.length}`
                            : ""}
                    </p>

                    <ul className="space-y-2">
                        {visible.map((record) => {
                            const date = record.due_date
                                ? new Date(`${record.due_date}T00:00:00`)
                                : null;

                            const valid_date =
                                date && !Number.isNaN(date.getTime())
                                    ? date
                                    : null;

                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            const overdue = valid_date && valid_date < today;

                            return (
                                <li
                                    key={record.id}
                                    className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <Link
                                            to={`/maintenance/${record.id}`}
                                            className="min-w-0 flex-1 break-words rounded-sm text-sm font-semibold text-[#0b2238] underline decoration-slate-300 underline-offset-4 hover:text-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-[#1d4ed8]"
                                        >
                                            {record.title}
                                        </Link>

                                        <StatusBadge
                                            tone={
                                                record.status === "In Progress"
                                                    ? "info"
                                                    : "neutral"
                                            }
                                        >
                                            {record.status || "Not recorded"}
                                        </StatusBadge>
                                    </div>

                                    <p className="mt-1 break-words text-xs text-slate-600">
                                        {record.aircraft ||
                                            "Unassigned aircraft"}
                                    </p>

                                    <div
                                        className={`mt-3 flex items-center gap-2 border-t border-slate-200/80 pt-2 text-xs ${
                                            overdue
                                                ? "font-medium text-red-700"
                                                : "text-slate-600"
                                        }`}
                                    >
                                        <CalendarDays
                                            size={14}
                                            className="shrink-0"
                                            aria-hidden="true"
                                        />

                                        {valid_date ? (
                                            <span>
                                                {overdue ? "Overdue" : "Due"} ·{" "}
                                                <time
                                                    dateTime={record.due_date}
                                                >
                                                    {valid_date.toLocaleDateString(
                                                        "en-PH",
                                                        {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        },
                                                    )}
                                                </time>
                                            </span>
                                        ) : (
                                            <span>Due date not recorded</span>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </>
            ) : (
                <div className="flex min-h-32 flex-col items-center justify-center gap-3 py-4 text-center">
                    <Wrench
                        size={24}
                        className="text-slate-400"
                        aria-hidden="true"
                    />
                    <p className="text-sm text-slate-500">
                        No pending maintenance records.
                    </p>
                </div>
            )}
        </Card>
    );
}
