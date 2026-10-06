import RecordList from "../../../shared/components/records/record_list";
import { personnel_config } from "../config/personnel_config";
import usePersonnel from "../hooks/use_personnel";

export default function PersonnelPage() {
    const rows = usePersonnel();
    return <RecordList config={personnel_config} rows={rows} can_add={true} />;
}
