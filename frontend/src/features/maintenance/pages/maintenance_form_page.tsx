import { useParams } from "react-router";
import MaintenancePage from "./maintenance_page";

export default function MaintenanceFormPage() {
    const { maintenance_id } = useParams();
    return <MaintenancePage create_on_load={!maintenance_id} edit_on_load={Boolean(maintenance_id)} />;
}