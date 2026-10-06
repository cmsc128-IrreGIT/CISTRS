import { create_preview_store } from "../../../shared/data/create_preview_store";
export const maintenance_store = create_preview_store([
    {
        "id": "maintenance-demo-1",
        "title": "Sample inspection",
        "aircraft": "Demo Aircraft B",
        "due_date": "2026-10-20",
        "status": "Scheduled",
        "part_number": "",
        "notes": "Fictional task for interface review."
    }
]);
