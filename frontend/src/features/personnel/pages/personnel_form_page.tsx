import RecordFormPage from "../../../shared/components/records/record_form_page";
import { personnel_config } from "../config/personnel_config";
import usePersonnel from "../hooks/use_personnel";
import { useParams } from "react-router";
import { personnel_store } from "../data/personnel_store";

export default function PersonnelFormPage() {
    const rows = usePersonnel();
    const { personnel_id } = useParams();
    return (
        <RecordFormPage
            config={personnel_config}
            rows={rows}
            record_id={personnel_id}
            on_save={personnel_store.save}
        />
    );
}
