import { Plane, Wrench } from "lucide-react";
import { Link } from "react-router";
import DonutChart from "../../../shared/components/charts/donut_chart";
import type { DonutChartEntry } from "../../../shared/components/charts/donut_chart";
import Card from "../../../shared/components/ui/card";
import type { PreviewRecord } from "../../../shared/types/record_types";
import { dashboard_list_limit } from "../config/dashboard_config";

type AircraftStatusCardProps = {
    data: DonutChartEntry[];
    maintenance: PreviewRecord[];
};

const link_style =
    "rounded-sm text-sm font-medium text-slate-600 underline underline-offset-4 decoration-slate-300 hover:text-[#0b2238] hover:decoration-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600";

export default function AircraftStatusCard({
    data,
    maintenance,
}: AircraftStatusCardProps) {
    const total = data.reduce((sum, entry) => sum + entry.value, 0);
    const visible_maintenance = maintenance.slice(0, dashboard_list_limit);

    return (
        <Card className="h-full">
            <div className="grid gap-5 md:grid-cols-2">
                <section
                    aria-labelledby="aircraft_status_title"
                    className="min-w-0"
                >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2
                            id="aircraft_status_title"
                            className="font-semibold text-slate-900"
                        >
                            Aircraft Status
                        </h2>
                        <Link to="/aircraft" className={link_style}>
                            View aircraft
                        </Link>
                    </div>

                    <div className="mt-4">
                        {total > 0 ? (
                            <DonutChart
                                data={data}
                                label="Aircraft counts by status"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-3 py-8 text-center">
                                <Plane
                                    size={24}
                                    className="text-slate-400"
                                    aria-hidden="true"
                                />
                                <p className="text-sm text-slate-500">
                                    No aircraft status data yet.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                <section
                    aria-labelledby="maintenance_title"
                    className="min-w-0 border-t border-slate-200 pt-5 md:border-l md:border-t-0 md:pl-5 md:pt-0"
                >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2
                            id="maintenance_title"
                            className="font-semibold text-slate-900"
                        >
                            Pending Maintenance
                        </h2>
                        <Link to="/maintenance" className={link_style}>
                            View records
                        </Link>
                    </div>

                    {visible_maintenance.length > 0 ? (
                        <>
                            <p className="mt-3 text-xs text-slate-500">
                                {visible_maintenance.length} of{" "}
                                {maintenance.length} pending tasks shown
                            </p>

                            <ul className="mt-2 divide-y divide-slate-100">
                                {visible_maintenance.map((record) => (
                                    <li key={record.id} className="space-y-2 py-4">
                                        <Link
                                            to={`/maintenance/${record.id}/edit`}
                                            className={`${link_style} break-words`}
                                        >
                                            {record.title}
                                        </Link>

                                        <p className="break-words text-sm text-slate-600">
                                            {record.aircraft || "Unassigned"}
                                        </p>

                                        <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                                            <span>
                                                Due:{" "}
                                                {record.due_date ? (
                                                    <time dateTime={record.due_date}>
                                                        {record.due_date}
                                                    </time>
                                                ) : (
                                                    "Not specified"
                                                )}
                                            </span>
                                            <span>{record.status}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : (
                        <div className="mt-4 flex flex-col items-center gap-3 py-8 text-center">
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
                </section>
            </div>
        </Card>
    );
}