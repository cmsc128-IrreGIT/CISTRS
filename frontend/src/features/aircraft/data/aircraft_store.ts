import { create_preview_store } from "../../../shared/data/create_preview_store";

export const aircraft_store = create_preview_store([
    {
        id: "aircraft-demo-a",
        registration: "RP-C8333",
        model: "",
        current_aircraft_hours: "4,286.7",
        status: "Operational",
        notes: "Preview status and hours only. Aircraft type is not confirmed in the supplied reference files.",
    },
    {
        id: "aircraft-demo-b",
        registration: "RP-C1738",
        model: "",
        current_aircraft_hours: "6,914.2",
        status: "Maintenance",
        notes: "Preview maintenance status and hours only. Aircraft type is not confirmed in the supplied reference files.",
    },
    {
        id: "aircraft-demo-c",
        registration: "RP-C984",
        model: "",
        current_aircraft_hours: "3,758.5",
        status: "Out of Service",
        notes: "Preview status and hours only. Aircraft type is not confirmed in the supplied reference files.",
    },
]);
