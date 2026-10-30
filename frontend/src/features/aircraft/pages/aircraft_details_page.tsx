import { Pencil } from "lucide-react";
import { Link, useParams } from "react-router";
import PageHeader from "../../../shared/components/ui/page_header";
import Card from "../../../shared/components/ui/card";
import DetailsList from "../../../shared/components/ui/details_list";
import EmptyState from "../../../shared/components/feedback/empty_state";
import { button_styles } from "../../../shared/styles/button_styles";
import RelatedMaintenance from "../../maintenance/components/related_maintenance";
import AircraftBreadcrumbs from "../components/aircraft_breadcrumbs";
import AircraftStatusBadge from "../components/aircraft_status_badge";
import useAircraft from "../hooks/use_aircraft";

export default function AircraftDetailsPage() {
    const { aircraft_id } = useParams();
    const rows = useAircraft();
    const record = rows.find((row) => row.id === aircraft_id);

    if (!record)
        return (
            <section aria-labelledby="page_title" className="space-y-4">
                <AircraftBreadcrumbs />
                <Card>
                    <EmptyState
                        title="Aircraft not found"
                        description="Choose an existing aircraft from the aircraft list."
                        action={
                            <Link
                                to="/aircraft"
                                className={button_styles("secondary")}
                            >
                                Return to aircraft
                            </Link>
                        }
                    />
                </Card>
            </section>
        );

    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <AircraftBreadcrumbs registration={record.registration} />
            <PageHeader
                title={record.registration || "Aircraft details"}
                title_id="page_title"
                help="Review the recorded aircraft status and related maintenance. Aircraft type and current hours remain preview values until confirmed by client records. Update status changes the record, not flight approval."
                actions={
                    <Link
                        to={`/aircraft/${record.id}/status`}
                        className={button_styles()}
                    >
                        <Pencil size={17} aria-hidden="true" />
                        Update status
                    </Link>
                }
            />
            <Card title="Aircraft information">
                <DetailsList
                    entries={[
                        {
                            id: "registration",
                            label: "Registration / Tail No.",
                            value: record.registration || "Not recorded",
                        },
                        {
                            id: "model",
                            label: "Aircraft Type",
                            value: record.model || "Not recorded",
                        },
                        {
                            id: "current_aircraft_hours",
                            label: "Current Aircraft Hours",
                            value: record.current_aircraft_hours
                                ? `${record.current_aircraft_hours} hrs`
                                : "Not recorded",
                        },
                        {
                            id: "status",
                            label: "Recorded Status",
                            value: (
                                <AircraftStatusBadge status={record.status} />
                            ),
                        },
                        {
                            id: "notes",
                            label: "Status Notes",
                            value: record.notes || "No status notes recorded",
                        },
                    ]}
                />
            </Card>
            <RelatedMaintenance aircraft={record.registration} />
        </section>
    );
}
