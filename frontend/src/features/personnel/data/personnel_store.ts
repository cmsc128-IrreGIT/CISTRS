import { create_preview_store } from "../../../shared/data/create_preview_store";
export const personnel_store = create_preview_store([
    {
        "id": "personnel-demo-1",
        "name": "Demo Employee",
        "position": "Inventory Staff",
        "personnel_type": "Employee",
        "contract_expiry": "2026-12-31",
        "email": "employee@example.com",
        "qualifications": "Sample qualification",
        "certificate_expiry": ""
    },
    {
        "id": "personnel-demo-2",
        "name": "Demo Pilot",
        "position": "Pilot",
        "personnel_type": "Pilot",
        "contract_expiry": "2026-11-30",
        "email": "pilot@example.com",
        "qualifications": "Sample pilot certificate",
        "certificate_expiry": "2027-01-31"
    }
]);
