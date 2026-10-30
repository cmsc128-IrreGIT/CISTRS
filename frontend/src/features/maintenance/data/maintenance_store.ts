import { create_preview_store } from "../../../shared/data/create_preview_store";

export const maintenance_store = create_preview_store([
    {
        id: "maintenance-demo-1",
        title: "Routine inspection",
        aircraft: "RP-C1738",
        due_date: "2026-10-20",
        status: "Scheduled",
        part_number: "",
        notes: "Preview maintenance task linked to RP-C1738 for interface review.",
    },
    {
        id: "maintenance-demo-2",
        title: "Oil and filter change",
        aircraft: "RP-C1738",
        due_date: "2026-11-08",
        status: "Scheduled",
        part_number: "",
        notes: "Preview recurring maintenance task for the same aircraft.",
    },
    {
        id: "maintenance-demo-3",
        title: "100-hour inspection",
        aircraft: "RP-C8333",
        due_date: "2026-10-12",
        status: "Completed",
        part_number: "",
        notes: "Preview completed maintenance record linked to RP-C8333.",
    },
    {
        id: "maintenance-demo-4",
        title: "Maintenance inspection",
        aircraft: "RP-C984",
        due_date: "2026-11-03",
        status: "In Progress",
        part_number: "",
        notes: "Preview active maintenance record linked to RP-C984.",
    },
]);
