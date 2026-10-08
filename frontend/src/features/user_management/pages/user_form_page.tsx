import type { PreviewRecord } from "../../../shared/types/record_types";
import RecordFormPage from "../../../shared/components/records/record_form_page";
import { user_management_config } from "../config/user_management_config";
import useUserManagement from "../hooks/use_user_management";
import { useParams } from "react-router";
import { user_management_store } from "../data/user_management_store";

export default function UserFormPage() {
    const rows = useUserManagement();
    const { user_id } = useParams();
    function save(values: Omit<PreviewRecord, "id">, id?: string) {
        if (
            rows.some(
                (row) =>
                    row.id !== id &&
                    (row.username.toLowerCase() ===
                        values.username.toLowerCase() ||
                        row.email.toLowerCase() === values.email.toLowerCase()),
            )
        ) {
            throw new Error("Username or email already exists in the preview.");
        }
        return user_management_store.save(values, id);
    }
    return (
        <RecordFormPage
            config={user_management_config}
            rows={rows}
            record_id={user_id}
            on_save={save}
        />
    );
}
