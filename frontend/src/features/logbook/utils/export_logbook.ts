import type { PreviewRecord } from "../../../shared/types/record_types";
import type { LogbookEntry } from "../types/logbook_types";
import { logbook_condition } from "./logbook_entries";

export type LogbookExportSettings = {
    aircraft: string;
    from: string;
    to: string;
    format: "pdf" | "csv";
};

export type LogbookReportRow = {
    entry: LogbookEntry;
    maintenance_reference: string;
};

export type LogbookReport = {
    settings: LogbookExportSettings;
    rows: LogbookReportRow[];
    prepared_by: string;
    prepared_at: string;
};

function csv_cell(value: string) {
    const starts_formula =
        /^[=+@-]/.test(value.trimStart()) || /^[\t\r\n]/.test(value);
    const safe = starts_formula ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
}

export function prepare_logbook_report(
    entries: readonly LogbookEntry[],
    settings: LogbookExportSettings,
    prepared_by: string,
    maintenance: readonly PreviewRecord[],
): LogbookReport {
    const maintenance_by_id = new Map(
        maintenance.map((record) => [record.id, record]),
    );
    const rows = entries
        .filter(
            (entry) =>
                (!settings.aircraft || entry.aircraft === settings.aircraft) &&
                entry.entry_date >= settings.from &&
                entry.entry_date <= settings.to,
        )
        .sort(
            (a, b) =>
                b.entry_date.localeCompare(a.entry_date) ||
                (b.entry_time || "").localeCompare(a.entry_time || ""),
        )
        .map((entry) => {
            const record = maintenance_by_id.get(entry.maintenance_id);
            const maintenance_reference =
                record && record.aircraft === entry.aircraft
                    ? record.work_order || record.title || "Maintenance record"
                    : entry.maintenance_id
                      ? "Linked record unavailable"
                      : "";
            return { entry, maintenance_reference };
        });
    return {
        settings,
        rows,
        prepared_by,
        prepared_at: new Date().toISOString(),
    };
}

export function export_logbook(rows: LogbookReportRow[]) {
    const cells = [
        [
            "Date (UTC)",
            "Time (UTC)",
            "Reference",
            "Aircraft",
            "Condition",
            "Author",
            "Remarks",
            "Action taken",
            "Linked maintenance",
        ],
        ...rows.map(({ entry: row, maintenance_reference }) => [
            row.entry_date,
            row.entry_time || "",
            row.log_page,
            row.aircraft,
            logbook_condition(row),
            row.recorded_by || "",
            row.defects,
            row.action_taken,
            maintenance_reference,
        ]),
    ];
    const csv = cells.map((row) => row.map(csv_cell).join(",")).join("\r\n");
    const url = URL.createObjectURL(
        new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "cistrs-logbook-entries.csv";
    try {
        document.body.append(link);
        link.click();
    } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}
