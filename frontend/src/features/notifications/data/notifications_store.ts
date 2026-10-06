import { create_preview_store } from "../../../shared/data/create_preview_store";
export const notifications_store = create_preview_store([
    { id: "alert-demo-1", title: "Sample stock alert", message: "Sample Seal has zero quantity in the initial preview.", to: "/inventory/sample-002", is_read: "false", created_at: "2026-10-06T08:00:00Z" },
    { id: "alert-demo-2", title: "Sample maintenance reminder", message: "Review the fictional inspection record.", to: "/maintenance", is_read: "false", created_at: "2026-10-06T09:00:00Z" },
]);
