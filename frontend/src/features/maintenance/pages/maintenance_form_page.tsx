import useAircraft from "../../aircraft/hooks/use_aircraft";
import RecordFormPage from "../../../shared/components/records/record_form_page";
import { maintenance_config } from "../config/maintenance_config";
import useMaintenance from "../hooks/use_maintenance";
import { useParams } from "react-router";
import { maintenance_store } from "../data/maintenance_store";

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
    return (
        <RecordFormPage
            config={config}
            rows={rows}
            record_id={maintenance_id}
            on_save={maintenance_store.save}
        />
    );
}
