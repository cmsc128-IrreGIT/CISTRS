import RecordDetails from "../../../shared/components/records/record_details";
import { personnel_config } from "../config/personnel_config";
import usePersonnel from "../hooks/use_personnel";
import { useParams } from "react-router";

export default function PersonnelDetailsPage() {
    const rows = usePersonnel();
    const { personnel_id } = useParams();
    return <RecordDetails config={personnel_config} record={rows.find((row) => row.id === personnel_id)} edit_to={`/personnel/${personnel_id}/edit`} />;
}
