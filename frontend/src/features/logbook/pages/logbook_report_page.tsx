import { Printer } from "lucide-react";
import { Link, useLocation } from "react-router";
import EmptyState from "../../../shared/components/feedback/empty_state";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import DetailsList from "../../../shared/components/ui/details_list";
import type { LogbookReport, LogbookReportRow } from "../utils/export_logbook";
import { entry_date, entry_reference, entry_updated_at, logbook_breadcrumb_title, logbook_condition, logbook_primary } from "../utils/logbook_entries";

const columns: TableColumn<LogbookReportRow>[] = [
    { id: "date", header: "Entry date / time (UTC)", render: ({ entry }) => (
        <div className="whitespace-nowrap">
            {entry_date(entry.entry_date)}{entry.entry_time ? `, ${entry.entry_time}` : ""}
            <p className="text-xs text-slate-600">{entry_reference(entry)}</p>
        </div>
    ) },
    { id: "aircraft", header: "Aircraft", render: ({ entry }) => entry.aircraft },
    { id: "condition", header: "Condition", render: ({ entry }) => (
        <span className={logbook_condition(entry) === "Defect reported" ? "text-red-700" : undefined}>{logbook_condition(entry)}</span>
    ) },
    { id: "remarks", header: "Remarks", render: ({ entry, maintenance_reference }) => (
        <div className="space-y-1 whitespace-pre-wrap wrap-anywhere">
            <p>{entry.defects || "—"}</p>
            {entry.action_taken && <p>{entry.action_taken}</p>}
            {maintenance_reference && <p className="text-xs text-slate-600">Linked maintenance · {maintenance_reference}</p>}
        </div>
    ) },
    { id: "author", header: "Author", render: ({ entry }) => entry.recorded_by || "Not recorded" },
];

export default function LogbookReportPage() {
    const { state } = useLocation();
    const report = state as LogbookReport | null;

    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <div className="print:hidden">
                <WorkspaceBreadcrumbs parents={[{ label: logbook_breadcrumb_title, to: "/logbook" }]} current="Export preview" />
            </div>
            <Card className="print:rounded-none print:border-0 [&_[role=region]]:print:overflow-visible [&_thead]:print:static [&_thead]:print:bg-white [&_thead]:print:text-black [&_tr]:print:break-inside-avoid">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h1 id="page_title" className="text-lg font-semibold text-[#0b2238]">Aircraft logbook report</h1>
                    {report && (
                        <Button className={`${logbook_primary} print:hidden`} onClick={() => window.print()}>
                            <Printer size={16} aria-hidden="true" /> Print / save PDF
                        </Button>
                    )}
                </div>
                {report ? (
                    <div className="space-y-5">
                        <DetailsList entries={[
                            { id: "aircraft", label: "Aircraft", value: report.settings.aircraft || "All aircraft" },
                            { id: "period", label: "Period", value: `${entry_date(report.settings.from)} – ${entry_date(report.settings.to)}` },
                            { id: "author", label: "Prepared by", value: report.prepared_by },
                            { id: "generated", label: "Generated (UTC)", value: entry_updated_at(report.prepared_at) },
                        ]} />
                        <DataTable inventory columns={report.settings.aircraft ? columns.filter(({ id }) => id !== "aircraft") : columns}
                            caption="Exported logbook entries" rows={report.rows} get_row_key={({ entry }) => entry.id} />
                    </div>
                ) : (
                    <EmptyState title="No report prepared" description="Prepare a report from the aircraft logbook."
                        action={<Link to="/logbook" className="underline underline-offset-4">Return to logbook</Link>} />
                )}
            </Card>
        </section>
    );
}
