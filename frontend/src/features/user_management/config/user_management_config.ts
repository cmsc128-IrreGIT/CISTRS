import type { RecordConfig } from "../../../shared/types/record_types";
export const user_management_config: RecordConfig = {
    "title": "User Management",
    "singular": "Account Record",
    "base_path": "/users",
    "fields": [
        {
            "key": "display_name",
            "label": "Display Name",
            "required": true,
            "type": "text"
        },
        {
            "key": "username",
            "label": "Username",
            "required": true,
            "type": "text"
        },
        {
            "key": "email",
            "label": "Email",
            "required": true,
            "type": "email"
        },
        {
            "key": "role",
            "label": "Role",
            "required": true,
            "type": "select",
            "options": [
                "Admin",
                "Staff",
                "Pilot"
            ]
        },
        {
            "key": "status",
            "label": "Account Status",
            "required": true,
            "type": "select",
            "options": [
                "Active",
                "Inactive"
            ]
        }
    ],
    "details": true,
    "note": "These are sample records. Saving does not create a login or enforce permissions."
};
