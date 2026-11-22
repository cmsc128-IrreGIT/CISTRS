import { useContext, useEffect, useRef, useState } from "react";
import type { SubmitEvent } from "react";
import { useNavigate } from "react-router";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import DetailsList from "../../../shared/components/ui/details_list";
import FormDialog from "../../../shared/components/ui/form_dialog";
import { AuthContext } from "../../auth/hooks/auth_context";
import useMaintenance from "../../maintenance/hooks/use_maintenance";
import type { LogbookEntry } from "../types/logbook_types";
import { export_logbook, prepare_logbook_report } from "../utils/export_logbook";
import type { LogbookExportSettings, LogbookReport } from "../utils/export_logbook";
import { entry_date, logbook_primary } from "../utils/logbook_entries";

type ExportState =
    | { stage: "criteria" | "preparing" | "empty" | "failed" }
    | { stage: "ready"; report: LogbookReport }
    | { stage: "download_failed"; report: LogbookReport };

const input_style = "min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8] aria-invalid:border-red-500";
const titles = {
    criteria: "Export logbook records",
    preparing: "Preparing your report",
    ready: "Report ready",
    empty: "No records to export",
    failed: "Export could not be prepared",
    download_failed: "Export could not be downloaded",
};

export default function LogbookExportDialog({
    rows,
    aircraft_options,
    selected_aircraft,
    selected_date,
    on_close,
}: {
    rows: LogbookEntry[];
    aircraft_options: string[];
    selected_aircraft: string;
    selected_date: string;
    on_close: () => void;
}) {
    const user = useContext(AuthContext)?.user;
    const navigate = useNavigate();
    const maintenance = useMaintenance();
    const [settings, set_settings] = useState<LogbookExportSettings>(() => {
        const dates = rows.filter((row) => !selected_aircraft || row.aircraft === selected_aircraft)
            .map((row) => row.entry_date).filter(Boolean).sort();
        const today = new Date().toISOString().slice(0, 10);
        return {
            aircraft: selected_aircraft,
            from: selected_date || dates[0] || today,
            to: selected_date || dates.at(-1) || today,
            format: "pdf",
        };
    });
    const [state, set_state] = useState<ExportState>({ stage: "criteria" });
    const [date_error, set_date_error] = useState("");
    const pending = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(pending.current), []);

    function prepare() {
        set_state({ stage: "preparing" });
        pending.current = window.setTimeout(() => {
            try {
                const report = prepare_logbook_report(rows, settings, user?.full_name ?? "Not recorded", maintenance);
                set_state(report.rows.length ? { stage: "ready", report } : { stage: "empty" });
            } catch {
                set_state({ stage: "failed" });
            }
        }, 150);
    }

    function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (settings.from > settings.to) {
            set_date_error("End date must be on or after the start date.");
            const field = event.currentTarget.elements.namedItem("to");
            if (field instanceof HTMLInputElement) field.focus();
            return;
        }
        set_date_error("");
        prepare();
    }

    function open_report(report: LogbookReport) {
        if (report.settings.format === "pdf") {
            void navigate("/logbook/report", { state: report });
            return;
        }
        try {
            export_logbook(report.rows);
            on_close();
        } catch {
            set_state({ stage: "download_failed", report });
        }
    }

    const { stage } = state;
    return (
        <FormDialog title={titles[stage]} compact on_close={on_close}>
            {stage === "criteria" ? (
                <form onSubmit={submit}>
                    <div className="space-y-4 p-4 sm:px-5">
                        <p className="text-xs text-slate-600"><span className="text-red-700">*</span> indicates a required field.</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <FormField label="Aircraft">
                                {(props) => (
                                    <select {...props} className={input_style} value={settings.aircraft}
                                        onChange={(event) => set_settings({ ...settings, aircraft: event.currentTarget.value })}>
                                        <option value="">All aircraft</option>
                                        {aircraft_options.map((registration) => <option key={registration}>{registration}</option>)}
                                    </select>
                                )}
                            </FormField>
                            <FormField label="Format" required>
                                {(props) => (
                                    <select {...props} className={input_style} value={settings.format}
                                        onChange={(event) => set_settings({ ...settings, format: event.currentTarget.value === "csv" ? "csv" : "pdf" })}>
                                        <option value="pdf">PDF · printable report</option>
                                        <option value="csv">CSV · spreadsheet</option>
                                    </select>
                                )}
                            </FormField>
                            <FormField label="From date" required>
                                {(props) => <input {...props} name="from" type="date" className={input_style} value={settings.from}
                                    onChange={(event) => { set_date_error(""); set_settings({ ...settings, from: event.currentTarget.value }); }} />}
                            </FormField>
                            <FormField label="To date" required error={date_error}>
                                {(props) => <input {...props} name="to" type="date" className={input_style} value={settings.to}
                                    onChange={(event) => { set_date_error(""); set_settings({ ...settings, to: event.currentTarget.value }); }} />}
                            </FormField>
                        </div>
                        <FormField label="Included in export">
                            {(props) => <input {...props} className={input_style} readOnly value="Condition, remarks, and related maintenance references" />}
                        </FormField>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4 sm:px-5">
                        <Button variant="secondary" onClick={on_close}>Cancel</Button>
                        <Button type="submit" className={logbook_primary}>Prepare report</Button>
                    </div>
                </form>
            ) : (
                <>
                    <div className="space-y-4 p-4 sm:px-5">
                        {stage === "preparing" && <p role="status" className="rounded-md bg-blue-100 p-3 text-sm text-blue-900">Preparing the selected logbook entries…</p>}
                        {stage === "ready" && <p role="status" className="rounded-md bg-emerald-100 p-3 text-sm text-emerald-900">Your report is ready.</p>}
                        {stage === "empty" && <p role="status" className="rounded-md bg-amber-100 p-3 text-sm text-amber-900">No entries match this aircraft and date range.</p>}
                        {(stage === "failed" || stage === "download_failed") && <p role="alert" className="rounded-md bg-red-100 p-3 text-sm text-red-900">The export could not be completed. Try again.</p>}
                        <div className="rounded-md bg-slate-100 p-4">
                            <DetailsList entries={[
                                { id: "aircraft", label: "Aircraft", value: settings.aircraft || "All aircraft" },
                                { id: "period", label: "Date range", value: `${entry_date(settings.from)} – ${entry_date(settings.to)}` },
                                { id: "format", label: "Format", value: settings.format.toUpperCase() },
                                { id: "matches", label: "Matching entries", value: "report" in state ? state.report.rows.length : stage === "empty" ? 0 : "—" },
                            ]} />
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4 sm:px-5">
                        <Button variant="secondary" onClick={on_close}>{stage === "ready" ? "Close" : "Cancel"}</Button>
                        {stage === "preparing" && <Button is_loading>Preparing…</Button>}
                        {stage === "ready" && <Button className={logbook_primary} onClick={() => open_report(state.report)}>
                            {settings.format === "pdf" ? "Preview report" : "Download CSV"}
                        </Button>}
                        {stage === "empty" && <Button className={logbook_primary} onClick={() => set_state({ stage: "criteria" })}>Change dates</Button>}
                        {stage === "failed" && <Button className={logbook_primary} onClick={prepare}>Try again</Button>}
                        {stage === "download_failed" && <Button className={logbook_primary} onClick={() => open_report(state.report)}>Try again</Button>}
                    </div>
                </>
            )}
        </FormDialog>
    );
}
