import { useParams } from "react-router";
import RecordFormPage from "../../../shared/components/records/record_form_page";
import type { PreviewRecord } from "../../../shared/types/record_types";
import { aircraft_config } from "../config/aircraft_config";
import useAircraft from "../hooks/use_aircraft";
import { aircraft_store } from "../data/aircraft_store";

export default function AircraftStatusPage() {
    const rows = useAircraft();
    const { aircraft_id } = useParams();
    const config = { ...aircraft_config, singular: "Aircraft Status", fields: aircraft_config.fields.filter((field) => ["status", "notes"].includes(field.key)) };
    function save(values: Omit<PreviewRecord, "id">, id?: string) {
        const existing = rows.find((row) => row.id === id);
        if (!existing) throw new Error("Aircraft not found.");
        return aircraft_store.save({ ...existing, ...values }, id);
    }
    return <RecordFormPage config={config} rows={rows} record_id={aircraft_id} on_save={save} />;
}
