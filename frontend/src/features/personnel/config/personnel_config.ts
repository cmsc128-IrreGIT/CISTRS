import type { RecordConfig } from "../../../shared/types/record_types";
export const personnel_config: RecordConfig = {
    title: "Personnel",
    singular: "Personnel Record",
    base_path: "/personnel",
    fields: [
        {
            key: "name",
            label: "Full Name",
            required: true,
            type: "text",
        },
        {
            key: "position",
            label: "Position",
            required: true,
            type: "text",
        },
        {
            key: "personnel_type",
            label: "Personnel Type",
            required: true,
            type: "select",
            options: ["Employee", "Pilot"],
        },
        {
            key: "contract_expiry",
            label: "Contract Expiry",
            required: false,
            type: "date",
        },
        {
            key: "email",
            label: "Email",
            required: false,
            type: "email",
        },
        {
            key: "qualifications",
            label: "Qualifications / Certificates",
            required: false,
            type: "textarea",
        },
        {
            key: "certificate_expiry",
            label: "Certificate Expiry",
            required: false,
            type: "date",
        },
    ],
    details: true,
    note: "Expiry dates are recorded only; alert timing is not configured.",
};
