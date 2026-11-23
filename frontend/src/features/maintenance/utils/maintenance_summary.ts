import type { MaintenanceRecord } from "../types/maintenance_types";
import { maintenance_id } from "../types/maintenance_types";
import { employee_name } from "../../../shared/utils/employee_name";

export function maintenance_summary(record: MaintenanceRecord) {
    const ad = "ad_UUID" in record;
    return {
        id: maintenance_id(record),
        title: ad ? record.subject : record.task_reference,
        aircraft: record.aircraft.registration,
        due_date: (ad ? record.next_due_date : record.due_date) ?? "",
        due_hours: ad ? record.next_due_hours : record.due_hours,
        status: record.due_status,
        overdue: record.overdue,
        accomplished_date: (ad ? record.date_of_compliance : record.last_accomplished_date) ?? "",
        recorded_by: employee_name(ad ? record.mechanic : record.assignee),
        performed_by: employee_name(ad ? record.mechanic : record.assignee),
    };
}
export type MaintenanceSummaryRecord = ReturnType<typeof maintenance_summary>;