import MaintenanceDetailsPage from "./maintenance_details_page";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import RecordFormPage from "../../../shared/components/records/record_form_page";
import { maintenance_config } from "../config/maintenance_config";
import useMaintenance from "../hooks/use_maintenance";
import { Navigate, useParams } from "react-router";
import { maintenance_service } from "../services/maintenance_service";

export default function MaintenanceFormPage() {
    const aircraft = useAircraft();
    const config = {
        ...maintenance_config,
        fields: maintenance_config.fields.map((field) =>
            field.key === "aircraft"
                ? { ...field, options: aircraft.map((row) => row.registration) }
                : field,
        ),
    };
    const rows = useMaintenance();
    const { maintenance_id } = useParams();
    if (rows.some((row) => row.id === maintenance_id && row.performed_date)) {
        return <Navigate replace to={`/maintenance/${maintenance_id}`} />;
    }
    return (
        <RecordFormPage
            background={maintenance_id ? <MaintenanceDetailsPage /> : undefined}
            return_to={
                maintenance_id
                    ? `/maintenance/${maintenance_id}`
                    : "/maintenance"
            }
            as_dialog
            background_config={maintenance_config}
            config={config}
            rows={rows}
            record_id={maintenance_id}
            on_save={maintenance_service.save_task}
        />
    );
}
