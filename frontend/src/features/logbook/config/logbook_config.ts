import type { RecordConfig } from "../../../shared/types/record_types";
export const logbook_config: RecordConfig = {
    "title": "Logbook",
    "singular": "Logbook Entry",
    "base_path": "/logbook",
    "fields": [
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
            "key": "entry_date",
            "label": "Entry Date",
            "required": true,
            "type": "date"
        },
        {
            "key": "condition",
            "label": "Recorded Condition",
            "required": true,
            "type": "text"
        },
        {
            "key": "recorded_by",
            "label": "Recorded By (Preview)",
            "required": true,
            "type": "text"
        },
        {
            "key": "remarks",
            "label": "Remarks",
            "required": true,
            "type": "textarea"
        }
    ],
    "details": false,
    "note": "Fields await the logbook template. No regulatory export or paper replacement is implemented."
};
