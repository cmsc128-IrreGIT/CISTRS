export type MaintenanceAircraft = {
    aircraft_UUID: string;
    registration: string;
    status: string;
    current_hours: number;
};
export type MaintenanceEmployee = {
    emp_UUID: string;
    emp_number: string;
    f_name: string;
    l_name: string;
};
type DueInfo = {
    due_status: "Overdue" | "Current" | "Not Scheduled";
    overdue: boolean;
    days_until_due: number | null;
    hours_until_due: number | null;
};
export type MaintenanceAdRecord = DueInfo & {
    ad_UUID: string;
    aircraft: MaintenanceAircraft;
    mechanic: MaintenanceEmployee;
    faa_ad_number: string;
    subject: string;
    ad_category: string;
    effective_date: string;
    compliance_method: string;
    mechanic_license_number: string;
    amendment_number: string | null;
    frequency: string | null;
    date_of_compliance: string | null;
    next_due_date: string | null;
    next_due_hours: number | null;
    remarks: string | null;
    pdf_link: string | null;
};
export type MaintenanceCpcpTask = DueInfo & {
    cpcp_UUID: string;
    aircraft: MaintenanceAircraft;
    assignee: MaintenanceEmployee;
    task_reference: string;
    description: string | null;
    due_hours: number | null;
    due_date: string | null;
    last_accomplished_date: string | null;
    last_updated: string;
    remarks: string | null;
};
export type MaintenanceRecord = MaintenanceAdRecord | MaintenanceCpcpTask;
export type MaintenanceKind = "ad" | "cpcp";
export type AircraftMaintenance = {
    aircraft: MaintenanceAircraft;
    overdue_count: number;
    ad_records: MaintenanceAdRecord[];
    cpcp_tasks: MaintenanceCpcpTask[];
};
export function maintenance_id(record: MaintenanceRecord) {
    return "ad_UUID" in record ? record.ad_UUID : record.cpcp_UUID;
}
