import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import EmptyState from "../../../shared/components/feedback/empty_state";
import RecordForm from "../../../shared/components/records/record_form";
import FormDialog from "../../../shared/components/ui/form_dialog";
import type { PreviewRecord, RecordField } from "../../../shared/types/record_types";
import { aircraft_config } from "../config/aircraft_config";
import { aircraft_status_history, aircraft_store } from "../data/aircraft_store";
import useAircraft from "../hooks/use_aircraft";
import AircraftDetailsPage from "./aircraft_details_page";

const status_fields: RecordField[] = [
    ...aircraft_config.fields.filter((field) => field.key === "status"),
    { key: "effective_date", label: "Effective date", type: "date" },
    { key: "reason", label: "Reason", type: "text" },
    ...aircraft_config.fields.filter((field) => field.key === "notes"),
];

export default function AircraftStatusPage() {
    const rows = useAircraft();
    const { aircraft_id } = useParams();
    const navigate = useNavigate();
    const record = rows.find((row) => row.id === aircraft_id);
    const destination = aircraft_id ? `/aircraft/${aircraft_id}` : "/aircraft";

    function save(values: Omit<PreviewRecord, "id">) {
        const existing = aircraft_store.get_snapshot().find((row) => row.id === aircraft_id);
        if (!existing) {
            toast.error("Aircraft not found.");
            return;
        }

        try {
            aircraft_status_history.save({
                ...values,
                aircraft_id: existing.id,
                previous_status: existing.status,
            });
            aircraft_store.save({ ...existing, ...values }, existing.id);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save status.");
            return;
        }
        toast.success("Aircraft status updated", { position: "bottom-right" });
        void navigate(destination);
    }

    return (
        <>
            <AircraftDetailsPage />
            <FormDialog title="Update aircraft status" compact on_close={() => void navigate(destination)}>
                <div className="space-y-4 p-4 sm:p-5">
                    {record ? (
                        <>
                            <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                                Updates apply to this preview session. Flight approval is separate.
                            </p>
                            <RecordForm
                                key={record.id}
                                fields={status_fields}
                                initial_values={{ ...record, effective_date: "", reason: "" }}
                                on_submit={save}
                                cancel_to={destination}
                                submit_text="Save status"
                            />
                        </>
                    ) : (
                        <EmptyState
                            title="Aircraft not found"
                            description="Return to the aircraft list and select an existing record."
                        />
                    )}
                </div>
            </FormDialog>
        </>
    );
}
