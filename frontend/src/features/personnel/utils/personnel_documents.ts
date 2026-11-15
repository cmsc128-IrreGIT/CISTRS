import { seeded_license_renewal } from "../config/personnel_document_config";
import type { PersonnelDocument, PersonnelLicense } from "../types/personnel_types";

export function license_document(license: PersonnelLicense): PersonnelDocument {
    return {
        id: license.emp_license_UUID,
        kind: "License",
        name: license.license_type?.license_type_name || license.license_number || "License",
        reference: license.license_number,
        issued: license.date_issued ?? "",
        expires: license.expiry_date ?? "",
        renewal: license.renewal_status?.status_name ?? seeded_license_renewal.get(license.renewal_status_UUID ?? "") ?? "",
    };
}

export function document_validity(expires: string, now = new Date()) {
    const expiry = Date.parse(expires.slice(0, 10));
    if (!Number.isFinite(expiry)) return { label: "No expiry recorded", tone: "neutral" } as const;

    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    if (expiry < today) return { label: "Expired", tone: "danger" } as const;
    if (expiry - today <= 30 * 86_400_000) return { label: "Expiring soon", tone: "warning" } as const;
    return { label: "Valid", tone: "success" } as const;
}
