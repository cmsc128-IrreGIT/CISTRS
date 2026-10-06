import type { RecordConfig } from "../../../shared/types/record_types";
export const aircraft_config: RecordConfig = {
    "title": "Aircraft",
    "singular": "Aircraft",
    "base_path": "/aircraft",
    "fields": [
        {
            "key": "registration",
            "label": "Registration",
            "required": true,
            "type": "text"
        },
        {
            "key": "model",
            "label": "Model",
            "required": true,
            "type": "text"
        },
        {
            "key": "status",
            "label": "Recorded Status",
            "required": true,
            "type": "select",
            "options": [
                "Operational",
                "Maintenance",
                "Out of Service"
            ]
        },
        {
            "key": "notes",
            "label": "Status Notes",
            "required": false,
            "type": "textarea"
        }
    ],
    "details": true,
    "note": "Status does not authorize aircraft operation."
};
