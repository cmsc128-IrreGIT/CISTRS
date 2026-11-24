import type { RecordConfig } from "../../../shared/types/record_types";
export const maintenance_config: RecordConfig = {
    title: "Maintenance",
    singular: "Maintenance Record",
    base_path: "/maintenance",
    fields: [
        {
            key: "title",
            label: "Task",
            required: true,
            type: "text",
        },
        {
            key: "aircraft",
            label: "Aircraft",
            required: true,
            type: "select",
            options: ["RP-C8333", "RP-C1738", "RP-C984"],
        },
        {
            key: "due_date",
            label: "Due Date",
            required: true,
            type: "date",
        },
        {
            key: "status",
            label: "Status",
            required: true,
            type: "select",
            options: ["Scheduled", "In Progress", "Completed"],
        },
        {
            key: "part_number",
            label: "Related Part Number",
            required: false,
            type: "text",
        },
        {
            key: "notes",
            label: "Maintenance Notes",
            required: true,
            type: "textarea",
        },
    ],
    details: false,
    note: "Records do not constitute maintenance approval.",
};

export const maintenance_work_types = [
    "Routine inspection",
    "Scheduled maintenance",
    "Corrective maintenance",
    "Other",
];

export const maintenance_work_order_field = {
    name: "work_order",
    label: "Work order",
    help: "Enter the work order reference for this maintenance.",
    placeholder: "Enter work order reference",
};

type MaintenanceWorkField = {
    name: string;
    label: string;
    required?: boolean;
    type?: "date" | "number";
    help?: string;
    placeholder?: string;
};

export const maintenance_work_fields: MaintenanceWorkField[] = [
    {
        name: "performed_date",
        label: "Date performed",
        required: true,
        type: "date",
    },
    {
        name: "performed_by",
        label: "Performed by",
        required: true,
        placeholder: "Enter technician name",
    },
    {
        name: "aircraft_hours",
        label: "Aircraft hours",
        type: "number",
        placeholder: "e.g. 1250.0",
        help: "Enter the recorded aircraft hours when this work was performed.",
    },
];
