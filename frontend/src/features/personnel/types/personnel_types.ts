export type PersonnelLicense = {
    emp_license_UUID: string;
    license_number: string;
    expiry_date: string | null;
    date_issued?: string | null;
    renewal_status_UUID?: string | null;
    renewal_status?: { status_name: string } | null;
    license_type?: { license_type_name: string };
};

export type PersonnelEmployeeResponse = {
    emp_UUID: string;
    emp_number: string;
    f_name: string;
    m_name?: string | null;
    l_name: string;
    suffix?: string | null;
    position_UUID?: string | null;
    position?: string | { position_name: string } | null;
    department?: string | null;
    personnel_category?: string | null;
    record_status?: string | null;
    base?: { base_name: string } | null;
    employment_status?: { status_name: string } | null;
    contacts?: {
        contact?: { contact_type: string; contact_value: string } | null;
    }[];
    licenses?: PersonnelLicense[];
};

export type PersonnelFormValues = {
    name: string;
    employee_number: string;
    position: string;
    department: string;
    email: string;
    phone: string;
    employment_status: string;
};

export type PersonnelRecord = PersonnelFormValues & {
    id: string;
    category: string;
    base: string;
    record_status: string;
    licenses: PersonnelLicense[];
    preview: boolean;
};

export type LookupItem = { id: string; name: string };

export type PersonnelDocumentKind =
    "License" | "Training" | "Medical" | "Company ID" | "Other";

export type PersonnelDocument = {
    id: string;
    kind: PersonnelDocumentKind;
    name: string;
    reference: string;
    issued: string;
    expires: string;
    renewal_date: string; // YYYY-MM-DD format, optional
    file?: File;
    file_path?: string;
};

export type PersonnelDocumentDraft = Omit<PersonnelDocument, "id"> & {
    personnel_id: string;
    // License-specific fields
    license_type_UUID?: string;
    renewal_status_UUID?: string;
    license_number?: string;
    issuing_authority?: string;
    // Medical-specific fields
    medical_class?: string;
    clinical_hospital?: string;
    // Training-specific fields
    training_type_UUID?: string;
    training_provider_UUID?: string;
    certificate_number?: string;
    date_completed?: string;
};
