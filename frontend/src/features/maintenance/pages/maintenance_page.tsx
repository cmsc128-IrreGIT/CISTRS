import RecordList from "../../../shared/components/records/record_list";
import { maintenance_config } from "../config/maintenance_config";
import useMaintenance from "../hooks/use_maintenance";

export default function MaintenancePage() {
    const rows = useMaintenance();
    return (
        <RecordList config={maintenance_config} rows={rows} can_add={true} />
    );
}
