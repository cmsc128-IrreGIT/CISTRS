import RecordDetails from "../../../shared/components/records/record_details";
import { user_management_config } from "../config/user_management_config";
import useUserManagement from "../hooks/use_user_management";
import { useParams } from "react-router";

export default function UserDetailsPage() {
    const rows = useUserManagement();
    const { user_id } = useParams();
    return (
        <RecordDetails
            config={user_management_config}
            record={rows.find((row) => row.id === user_id)}
            edit_to={`/users/${user_id}/edit`}
        />
    );
}
