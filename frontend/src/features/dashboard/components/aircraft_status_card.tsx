import { Plane, Wrench } from "lucide-react";
import { Link } from "react-router";
import DonutChart from "../../../shared/components/charts/donut_chart";
import type { DonutChartEntry } from "../../../shared/components/charts/donut_chart";
import Card from "../../../shared/components/ui/card";

type AircraftStatusCardProps = {
    data: DonutChartEntry[];
};

export default function AircraftStatusCard({ data }: AircraftStatusCardProps) {
    const total = data.reduce((sum, entry) => sum + entry.value, 0);

    return (
        <Card className="h-full">
            <div className="grid gap-5 md:grid-cols-2">
                <section aria-labelledby="aircraft_status_title" className="min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2
                            id="aircraft_status_title"
                            className="font-semibold text-slate-900"
                        >
                            Aircraft Status
                        </h2>
                        <Link
                            to="/aircraft"
                            className="rounded-sm text-sm font-medium text-slate-600 underline underline-offset-4 decoration-slate-300 hover:text-[#0b2238] hover:decoration-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
                        >
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
                            Maintenance
                        </h2>
                        <Link
                            to="/maintenance"
                            className="rounded-sm text-sm font-medium text-slate-600 underline underline-offset-4 decoration-slate-300 hover:text-[#0b2238] hover:decoration-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
                        >
                            View records
                        </Link>
                    </div>

                    <div className="mt-4 flex flex-col items-center gap-3 py-8 text-center">
                        <Wrench
                            size={24}
                            className="text-slate-400"
                            aria-hidden="true"
                        />
                        <p className="text-sm text-slate-500">
                            Maintenance records will appear here.
                        </p>
                    </div>
                </section>
            </div>
        </Card>
    );
}