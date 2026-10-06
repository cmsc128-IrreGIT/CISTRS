import useAircraft from "../../aircraft/hooks/use_aircraft";
import RecordFormPage from "../../../shared/components/records/record_form_page";
import { logbook_config } from "../config/logbook_config";
import useLogbook from "../hooks/use_logbook";
import { useParams } from "react-router";
import { logbook_store } from "../data/logbook_store";

export default function LogbookFormPage() {
    const aircraft = useAircraft();
    const config = { ...logbook_config, fields: logbook_config.fields.map((field) => field.key === "aircraft" ? { ...field, options: aircraft.map((row) => row.registration) } : field) };
    const rows = useLogbook();
    const { entry_id } = useParams();
    return <RecordFormPage config={config} rows={rows} record_id={entry_id} on_save={logbook_store.save} />;
}
