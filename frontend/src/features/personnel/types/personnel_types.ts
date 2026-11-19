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
    date_of_birth?: string;
    sex?: "Male" | "Female";
    blood_type?: string | null;
    photo?: string | null;
    date_hired?: string;
    base_UUID?: string;
    emp_status_UUID?: string;
    personnel_category_UUID?: string;
    position_UUID?: string;
    supervisor_emp_UUID?: string | null;
    position?: string | { position_UUID?: string; position_name: string } | null;
    department?: string | null;
    personnel_category?: string | null;
    record_status?: string | null;
    base?: { base_UUID?: string; base_name: string; base_status?: string } | null;
    employment_status?: { emp_status_UUID?: string; status_name: string } | null;
    supervisor?: { emp_UUID: string; emp_number: string; f_name: string; l_name: string } | null;
    contacts?: { contact?: { contact_type: string; contact_value: string } | null }[];
    licenses?: PersonnelLicense[];
};

export type PersonnelEmployeeInput = {
    emp_number: string;
    f_name: string;
    m_name?: string | null;
    l_name: string;
    suffix?: string | null;
    date_of_birth: string;
    sex: "Male" | "Female";
    blood_type?: string | null;
    date_hired: string;
    department: string;
    record_status: "Active" | "Inactive";
    supervisor_emp_UUID?: string | null;
    base_UUID: string;
    emp_status_UUID: string;
    position_UUID: string;
    personnel_category_UUID: string;
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
    f_name: string;
    m_name: string;
    l_name: string;
    suffix: string;
    date_of_birth: string;
    sex: "Male" | "Female" | "";
    blood_type: string;
    date_hired: string;
    base_UUID: string;
    base_status: string;
    emp_status_UUID: string;
    personnel_category_UUID: string;
    position_UUID: string;
    supervisor_emp_UUID: string;
    supervisor_name?: string;
    photo?: string;
};

export type PersonnelDocumentKind = "License" | "Training" | "Medical" | "Company ID";

export type PersonnelDocument = {
    id: string;
    kind: PersonnelDocumentKind;
    name: string;
    reference: string;
    issued: string;
    expires: string;
    renewal: string;
    file?: File;
};

export type PersonnelDocumentDraft = Omit<PersonnelDocument, "id"> & { personnel_id: string };
