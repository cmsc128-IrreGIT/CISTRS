import RecordList from "../../../shared/components/records/record_list";
import { user_management_config } from "../config/user_management_config";
import useUserManagement from "../hooks/use_user_management";

export default function UsersPage() {
    const rows = useUserManagement();
    return <RecordList config={user_management_config} rows={rows} can_add={true} />;
}
