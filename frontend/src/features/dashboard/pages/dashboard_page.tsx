import { Link } from "react-router";
import PreviewNotice from "../../../shared/components/feedback/preview_notice";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import StatCard from "../../../shared/components/ui/stat_card";
import AircraftStatusCard from "../components/aircraft_status_card";
import OutOfStockCard from "../components/out_of_stock_card";
import RecentActivityTable from "../components/recent_activity_table";
import useDashboardSummary from "../hooks/use_dashboard_summary";

export default function DashboardPage() {
    const {
        summaries,
        out_of_stock,
        recent_changes,
        aircraft_status_data,
        pending_maintenance,
    } = useDashboardSummary();

    return (
        <section aria-labelledby="page_title" className="space-y-5">
            <PageHeader title="Dashboard" title_id="page_title" />

            <PreviewNotice>
                Preview mode · Changes reset on refresh.
            </PreviewNotice>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaries.map((summary) => (
                    <StatCard key={summary.label} {...summary} />
                ))}
            </div>

            <div className="grid items-stretch gap-4 xl:grid-cols-3">
                <OutOfStockCard items={out_of_stock} />

                <div className="min-w-0 xl:col-span-2">
                    <AircraftStatusCard
                        data={aircraft_status_data}
                        maintenance={pending_maintenance}
                    />
                </div>
            </div>

            <Card
                title="Recent Activity"
                action={
                    <Link
                        to="/inventory/history"
                        className="rounded-sm text-sm font-medium text-slate-600 underline underline-offset-4 decoration-slate-300 hover:text-[#0b2238] hover:decoration-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
                    >
                        View history
                    </Link>
                }
            >
                <RecentActivityTable rows={recent_changes} />
            </Card>
        </section>
    );
}
