import RecordList from "../../../shared/components/records/record_list";
import { logbook_config } from "../config/logbook_config";
import useLogbook from "../hooks/use_logbook";

export default function LogbookPage() {
    const rows = useLogbook();
    return <RecordList config={logbook_config} rows={rows} can_add={true} />;
}
