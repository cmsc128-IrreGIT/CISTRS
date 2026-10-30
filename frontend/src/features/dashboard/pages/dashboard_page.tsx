import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import { Link } from "react-router";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import AircraftStatusCard from "../components/aircraft_status_card";
import DashboardOverview from "../components/dashboard_overview";
import OutOfStockCard from "../components/out_of_stock_card";
import PendingMaintenanceCard from "../components/pending_maintenance_card";
import RecentActivityTable from "../components/recent_activity_table";
import useDashboardSummary from "../hooks/use_dashboard_summary";

export default function DashboardPage() {
    const {
        summaries,
        out_of_stock,
        recent_changes,
        aircraft_status_data,
        pending_maintenance,
        inventory_loading,
        inventory_error,
        reload_inventory,
        history_loading,
        history_error,
        reload_history,
    } = useDashboardSummary();

    return (
        <section aria-labelledby="page_title" className="@container space-y-3">
            <PageHeader title="Dashboard" title_id="page_title" />

            <DashboardOverview summaries={summaries} />

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] items-stretch gap-4">
                <div className="min-w-0">
                    {inventory_loading ? (
                        <ScreenLoading compact label="Loading inventory…" />
                    ) : inventory_error ? (
                        <div
                            role="alert"
                            className="h-full rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600"
                        >
                            <p>Inventory could not be loaded.</p>
                            <button
                                type="button"
                                onClick={() => void reload_inventory()}
                                className="min-h-11 rounded px-3 text-sm font-medium text-[#1d4ed8] underline focus-visible:outline-2"
                            >
                                Retry inventory
                            </button>
                        </div>
                    ) : (
                        <OutOfStockCard items={out_of_stock} />
                    )}
                </div>

                <div className="min-w-0">
                    <AircraftStatusCard data={aircraft_status_data} />
                </div>

                <div className="min-w-0 lg:col-span-2 2xl:col-span-1">
                    <PendingMaintenanceCard maintenance={pending_maintenance} />
                </div>
            </div>

            <Card
                compact
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
                {history_loading ? (
                    <ScreenLoading compact label="Loading activity…" />
                ) : history_error ? (
                    <div
                        role="alert"
                        className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600"
                    >
                        <p>Inventory activity could not be loaded.</p>
                        <button
                            type="button"
                            onClick={() => void reload_history()}
                            className="min-h-11 rounded px-3 text-sm font-medium text-[#1d4ed8] underline focus-visible:outline-2"
                        >
                            Retry activity
                        </button>
                    </div>
                ) : (
                    <RecentActivityTable rows={recent_changes.slice(0, 2)} />
                )}
            </Card>
        </section>
    );
}



