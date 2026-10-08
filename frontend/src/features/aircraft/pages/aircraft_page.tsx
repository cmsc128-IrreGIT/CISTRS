import RecordList from "../../../shared/components/records/record_list";
import { aircraft_config } from "../config/aircraft_config";
import useAircraft from "../hooks/use_aircraft";

export default function AircraftPage() {
    const rows = useAircraft();
    return <RecordList config={aircraft_config} rows={rows} can_add={false} />;
}
