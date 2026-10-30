import { Plane } from "lucide-react";
import { Link } from "react-router";
import DonutChart from "../../../shared/components/charts/donut_chart";
import type { DonutChartEntry } from "../../../shared/components/charts/donut_chart";
import Card from "../../../shared/components/ui/card";

type AircraftStatusCardProps = {
    data: DonutChartEntry[];
};

const link_style =
    "rounded-sm text-sm font-medium text-slate-600 underline underline-offset-4 decoration-slate-300 hover:text-[#0b2238] hover:decoration-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600";

export default function AircraftStatusCard({ data }: AircraftStatusCardProps) {
    const total = data.reduce((sum, entry) => sum + entry.value, 0);

    return (
        <Card
            compact
            className="h-full"
            title="Aircraft Status"
            action={
                <Link to="/aircraft" className={link_style}>
                    View aircraft
                </Link>
            }
        >
            {total > 0 ? (
                <DonutChart
                    data={data}
                    label="Aircraft counts by status"
                    compact
                />
            ) : (
                <div className="flex min-h-32 flex-col items-center justify-center gap-3 py-4 text-center">
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
        </Card>
    );
}
