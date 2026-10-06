import { create_preview_store } from "../../../shared/data/create_preview_store";
export const logbook_store = create_preview_store([
    {
        "id": "logbook-demo-1",
        "aircraft": "Demo Aircraft A",
        "entry_date": "2026-10-06",
        "condition": "Sample condition entry",
        "recorded_by": "Demo Staff",
        "remarks": "Fictional entry. Awaiting the actual blank logbook template."
    }
]);
