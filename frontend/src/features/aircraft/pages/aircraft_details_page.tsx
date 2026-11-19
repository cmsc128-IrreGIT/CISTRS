import WorkspaceTabs from "../../../shared/components/navigation/workspace_tabs";
import { Info, Pencil, Plane, Wrench } from "lucide-react";
import { useContext } from "react";
import { AuthContext } from "../../auth/hooks/auth_context";
import { Link, useParams, useSearchParams } from "react-router";
import Card from "../../../shared/components/ui/card";
import DetailsList from "../../../shared/components/ui/details_list";
import EmptyState from "../../../shared/components/feedback/empty_state";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import Button from "../../../shared/components/ui/button";
import { button_styles } from "../../../shared/styles/button_styles";
import { workspace_tab_style } from "../../../shared/styles/tab_styles";
import AircraftMaintenanceRecords from "../components/aircraft_maintenance";
import AircraftBreadcrumbs from "../components/aircraft_breadcrumbs";
import AircraftStatusBadge from "../components/aircraft_status_badge";
import { useAircraftData } from "../hooks/use_aircraft";

const sections = [
    { id: "information", label: "Aircraft Information", icon: Info },
    { id: "maintenance", label: "Maintenance", icon: Wrench },
];

export default function AircraftDetailsPage() {
    const { aircraft_id } = useParams();
    const [params] = useSearchParams();
    const { aircraft: rows, is_loading, error, reload } = useAircraftData();
    const can_view_maintenance = useContext(AuthContext)?.user?.features.includes("Maintenance") ?? true;
    const record = rows.find((row) => row.aircraft_UUID === aircraft_id);

    if (is_loading) {
        return <ScreenLoading label="Loading aircraft…" />;
    }

    if (error) {
        return (
            <section className="space-y-4">
                <AircraftBreadcrumbs />
                <Card>
                    <p role="alert" className="mb-3 text-sm text-red-800">{error}</p>
                    <Button variant="ghost" onClick={() => void reload()}>Retry</Button>
                </Card>
            </section>
        );
    }

    if (!record) {
        return (
            <section className="space-y-4">
                <AircraftBreadcrumbs />
                <Card>
                    <EmptyState
                        title="Aircraft not found"
                        description="Choose an existing aircraft from the aircraft list."
                        action={<Link to="/aircraft" className={button_styles("secondary")}>Return to aircraft</Link>}
                    />
                </Card>
            </section>
        );
    }

    const available_sections = sections.filter(({ id }) => id !== "maintenance" || can_view_maintenance);
    const active = available_sections.find((section) => section.id === params.get("tab")) ?? sections[0];
    const path = `/aircraft/${record.aircraft_UUID}`;
    const maintenance_url = `/maintenance?${new URLSearchParams({ aircraft: record.registration, tab: "overview" })}`;

    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <AircraftBreadcrumbs registration={record.registration} />
            <h1 id="page_title" className="text-2xl font-semibold text-[#0b2238]">
                {record.registration || "Aircraft details"}
            </h1>
            <Card>
                <WorkspaceTabs label="Aircraft record sections" className="mb-5">
                    {available_sections.map(({ id, label, icon: Icon }) => (
                        <Link
                            key={id}
                            to={id === "information" ? path : `${path}?tab=${id}`}
                            aria-current={id === active.id ? "page" : undefined}
                            className={workspace_tab_style(id === active.id)}
                        >
                            <Icon size={16} aria-hidden="true" />
                            {label}
                        </Link>
                    ))}
                </WorkspaceTabs>
                {active.id === "information" && (
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="font-semibold text-[#0b2238]">Aircraft information</h2>
                            <Link to={`${path}/status`} className={button_styles("secondary")}>
                                <Pencil size={16} aria-hidden="true" />
                                Update status
                            </Link>
                        </div>
                        <div className="grid gap-5 md:grid-cols-[minmax(9rem,1fr)_minmax(0,2.5fr)]">
                            <div className="grid min-h-36 place-content-center justify-items-center gap-2 rounded-lg bg-slate-100 text-sm text-slate-600">
                                <Plane size={24} aria-hidden="true" />
                                No photo available
                            </div>
                            <DetailsList entries={[
                                { id: "registration", label: "Registration / Tail No.", value: record.registration || "Not recorded" },
                                { id: "model", label: "Aircraft type", value: record.aircraft_type.type_name || "Not recorded" },
                                { id: "hours", label: "Current aircraft hours", value: `${record.current_hours.toLocaleString()} hrs` },
                                { id: "hours_updated_at", label: "Hours last updated", value: record.hours_updated_at ? new Date(record.hours_updated_at).toLocaleString() : "Not recorded" },
                                { id: "status", label: "Current status", value: <AircraftStatusBadge status={record.status.status_name} /> },
                                { id: "status_description", label: "Status description", value: record.status.description || "No description provided" },
                            ]} />
                        </div>
                        {can_view_maintenance && <div className="space-y-2 border-t border-slate-200 pt-4">
                            <h2 className="font-semibold text-[#0b2238]">Next tasks</h2>
                            <AircraftMaintenanceRecords aircraft_id={record.aircraft_UUID} upcoming />
                        </div>}
                    </div>
                )}
                {active.id === "maintenance" && (
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="font-semibold text-[#0b2238]">Related maintenance</h2>
                            <Link to={maintenance_url} className="text-sm text-link">View maintenance</Link>
                        </div>
                        <AircraftMaintenanceRecords aircraft_id={record.aircraft_UUID} />
                    </div>
                )}
            </Card>
        </section>
    );
}
