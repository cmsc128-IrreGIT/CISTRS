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
    base_UUID?: string;
    emp_status_UUID?: string;
    personnel_category_UUID?: string;
    supervisor_emp_UUID?: string | null;
    date_of_birth?: string;
    date_hired?: string;
    sex?: "Male" | "Female";
    blood_type?: string | null;
    photo?: string | null;
    position?: string | { position_name: string } | null;
    department?: string | null;
    personnel_category?: string | null;
    record_status?: string | null;
    base?: { base_name: string; base_UUID?: string } | null;
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
    employee?: PersonnelEmployeeResponse;
};

export type PersonnelInput = {
    emp_number: string;
    f_name: string;
    m_name?: string | null;
    l_name: string;
    suffix?: string | null;
    date_of_birth: string;
    sex: "Male" | "Female";
    blood_type?: string | null;
    photo?: string | null;
    date_hired: string;
    department: string;
    record_status: "Active" | "Inactive";
    supervisor_emp_UUID?: string | null;
    base_UUID: string;
    emp_status_UUID: string;
    position_UUID: string;
    personnel_category_UUID: string;
};

export type PersonnelLookups = {
    bases: { base_UUID: string; base_name: string }[];
    employment_statuses: { emp_status_UUID: string; status_name: string }[];
    personnel_categories: {
        personnel_category_UUID: string;
        category_name: string;
    }[];
    positions: { position_UUID: string; position_name: string }[];
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
