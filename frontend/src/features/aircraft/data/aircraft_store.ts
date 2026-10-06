import { create_preview_store } from "../../../shared/data/create_preview_store";
export const aircraft_store = create_preview_store([
    {
        "id": "aircraft-demo-a",
        "registration": "Demo Aircraft A",
        "model": "Sample aircraft model",
        "status": "Operational",
        "notes": "Fictional record. This status is not clearance to fly."
    },
    {
        "id": "aircraft-demo-b",
        "registration": "Demo Aircraft B",
        "model": "Sample aircraft model",
        "status": "Maintenance",
        "notes": "Fictional maintenance status."
    }
]);
