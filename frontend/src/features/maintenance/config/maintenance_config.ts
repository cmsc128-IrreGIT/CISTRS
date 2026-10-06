import type { RecordConfig } from "../../../shared/types/record_types";
export const maintenance_config: RecordConfig = {
    "title": "Maintenance",
    "singular": "Maintenance Record",
    "base_path": "/maintenance",
    "fields": [
        {
            "key": "title",
            "label": "Task",
            "required": true,
            "type": "text"
        },
        {
            "key": "aircraft",
            "label": "Aircraft",
            "required": true,
            "type": "select",
            "options": [
                "Demo Aircraft A",
                "Demo Aircraft B"
            ]
        },
        {
            "key": "due_date",
            "label": "Due Date",
            "required": true,
            "type": "date"
        },
        {
            "key": "status",
            "label": "Status",
            "required": true,
            "type": "select",
            "options": [
                "Scheduled",
                "In Progress",
                "Completed"
            ]
        },
        {
            "key": "part_number",
            "label": "Related Part Number",
            "required": false,
            "type": "text"
        },
        {
            "key": "notes",
            "label": "Maintenance Notes",
            "required": true,
            "type": "textarea"
        }
    ],
    "details": false,
    "note": "Records do not constitute maintenance approval."
};
