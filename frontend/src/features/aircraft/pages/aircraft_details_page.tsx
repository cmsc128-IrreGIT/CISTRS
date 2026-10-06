import RecordDetails from "../../../shared/components/records/record_details";
import { aircraft_config } from "../config/aircraft_config";
import useAircraft from "../hooks/use_aircraft";
import { useParams } from "react-router";

export default function AircraftDetailsPage() {
    const rows = useAircraft();
    const { aircraft_id } = useParams();
    return <RecordDetails config={aircraft_config} record={rows.find((row) => row.id === aircraft_id)} edit_to={`/aircraft/${aircraft_id}/status`} />;
}
