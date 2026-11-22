import type { RecordConfig } from "../../../shared/types/record_types";

export const aircraft_config: RecordConfig = {
    title: "Aircraft",
    singular: "Aircraft",
    base_path: "/aircraft",
    fields: [
        {
            key: "registration",
            label: "Registration / Tail No.",
            required: true,
            type: "text",
        },
        {
            key: "model",
            label: "Aircraft Type",
            required: false,
            type: "text",
        },
        {
            key: "current_aircraft_hours",
            label: "Current Aircraft Hours",
            required: false,
            type: "text",
        },
        {
            key: "status",
            label: "Recorded Status",
            required: true,
            type: "select",
            options: ["Operational", "Maintenance", "Out of Service"],
        },
        {
            key: "notes",
            label: "Status Notes",
            required: false,
            type: "textarea",
        },
    ],
    details: true,
    note: "Aircraft registrations follow the supplied client reference files. Aircraft type, hours, and recorded status remain preview values until confirmed by Shuttle Air records.",
};
