import type { PreviewRecord } from "../../../shared/types/record_types";

type MaintenanceFilters = {
    aircraft: string;
    part: string;
    status: string;
    date: string;
    term: string;
    task_view: boolean;
};

export function filter_maintenance_records(
    rows: readonly PreviewRecord[],
    { aircraft, part, status, date, term, task_view }: MaintenanceFilters,
    today: Date,
) {
    const due_limit = new Date(today);
    due_limit.setHours(0, 0, 0, 0);
    due_limit.setDate(due_limit.getDate() + 30);

    const filtered = rows.filter((row) => {
        if (aircraft && row.aircraft !== aircraft) return false;

        if (task_view) {
            if (part && row.part_number !== part) return false;
            if (status === "due") {
                const due_date = new Date(`${row.due_date}T00:00:00`);
                if (row.status === "Completed" || !(due_date <= due_limit))
                    return false;
            } else if (status === "pending") {
                if (row.status === "Completed") return false;
            } else if (status && row.status !== status) {
                return false;
            }
        } else if (
            (row.status !== "Completed" && !row.performed_date) ||
            (date && row.performed_date !== date)
        ) {
            return false;
        }

        return [
            row.title,
            row.aircraft,
            row.work_order,
            row.description,
            row.part_number,
            row.notes,
        ].some((value) => (value || "").toLowerCase().includes(term));
    });

    return task_view
        ? filtered
        : filtered.sort((first, second) =>
              (second.performed_date || "").localeCompare(
                  first.performed_date || "",
              ),
          );
}
