import { Link, useParams } from "react-router";
import PageHeader from "../../../shared/components/ui/page_header";
import Card from "../../../shared/components/ui/card";
import DetailsList from "../../../shared/components/ui/details_list";
import EmptyState from "../../../shared/components/feedback/empty_state";
import BackLink from "../../../shared/components/navigation/back_link";
import { button_styles } from "../../../shared/styles/button_styles";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import useMaintenance from "../hooks/use_maintenance";
import MaintenanceTable from "../components/maintenance_table";
export default function MaintenanceDetailsPage() {
    const { maintenance_id } = useParams();
    const rows = useMaintenance();
    const aircraft = useAircraft();
    const record = rows.find((row) => row.id === maintenance_id);
    if (!record)
        return (
            <Card>
                <EmptyState
                    title="Maintenance record not found"
                    description="Return to maintenance and choose an existing record."
                    action={
                        <Link
                            to="/maintenance"
                            className={button_styles("secondary")}
                        >
                            Return to maintenance
                        </Link>
                    }
                />
            </Card>
        );
    const associated = aircraft.find(
        (row) => row.registration === record.aircraft,
    );
    const related = rows.filter(
        (row) =>
            row.id !== record.id &&
            (record.part_number
                ? row.part_number === record.part_number
                : row.aircraft === record.aircraft),
    );
    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <BackLink to="/maintenance" label="Back to maintenance" />
            <PageHeader
                title={record.title || "Maintenance record"}
                title_id="page_title"
                description="Maintenance record details"
                help="Review the recorded task, associated aircraft or part, and notes. Maintenance records do not by themselves certify an aircraft for flight."
                actions={
                    <Link
                        to={`/maintenance/${record.id}/edit`}
                        className={button_styles()}
                    >
                        Edit maintenance record
                    </Link>
                }
            />
            <Card title="Record information">
                <DetailsList
                    entries={[
                        {
                            id: "aircraft",
                            label: "Aircraft",
                            value: associated ? (
                                <Link
                                    className="text-[#1d4ed8] underline"
                                    to={`/aircraft/${associated.id}`}
                                >
                                    {record.aircraft}
                                </Link>
                            ) : (
                                record.aircraft || "Not recorded"
                            ),
                        },
                        {
                            id: "part",
                            label: "Related part number",
                            value: record.part_number || "No part recorded",
                        },
                        {
                            id: "date",
                            label: "Due date",
                            value: record.due_date || "Not recorded",
                        },
                        {
                            id: "status",
                            label: "Recorded condition / status",
                            value: record.status || "Status unavailable",
                        },
                        {
                            id: "notes",
                            label: "Work / condition notes",
                            value: record.notes || "No notes recorded",
                        },
                    ]}
                />
            </Card>
            <Card
                title={
                    record.part_number
                        ? "Other maintenance for this part"
                        : "Other maintenance for this aircraft"
                }
            >
                <MaintenanceTable rows={related} />
            </Card>
        </section>
    );
}
