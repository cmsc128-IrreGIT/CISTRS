import { create_preview_store } from "../../../shared/data/create_preview_store";
export const user_management_store = create_preview_store([
    {
        "id": "user-demo-1",
        "display_name": "Demo Admin",
        "username": "demo_admin",
        "email": "admin@example.com",
        "role": "Admin",
        "status": "Active"
    },
    {
        "id": "user-demo-2",
        "display_name": "Demo Staff",
        "username": "demo_staff",
        "email": "staff@example.com",
        "role": "Staff",
        "status": "Active"
    }
]);
