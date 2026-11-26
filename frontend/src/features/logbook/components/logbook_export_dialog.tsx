import { useState } from "react";
import type { SubmitEvent } from "react";
import { ApiError } from "../../../shared/api/client";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import DetailsList from "../../../shared/components/ui/details_list";
import FormDialog from "../../../shared/components/ui/form_dialog";
import { logbook_service } from "../services/logbook_service";
import type { LogbookAircraft, LogbookEntry } from "../types/logbook_types";
import { entry_date } from "../utils/logbook_entries";

type PreparedExport = Awaited<ReturnType<typeof logbook_service.prepare_export>>;

type ExportState =
    | { stage: "criteria" | "preparing" | "empty" }
    | { stage: "failed"; message: string }
    | { stage: "ready" | "download_failed"; report: PreparedExport };

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
    selected_from_date,
    selected_to_date,
    on_close,
}: {
    rows: LogbookEntry[];
    aircraft_options: Pick<LogbookAircraft, "aircraft_UUID" | "registration">[];
    selected_aircraft: string;
    selected_from_date: string;
    selected_to_date: string;
    on_close: () => void;
}) {
    const [settings, set_settings] = useState(() => {
        const dates = rows.filter((row) => !selected_aircraft || row.aircraft.registration === selected_aircraft)
            .map((row) => row.flight_date).filter(Boolean).sort();
        const today = new Date().toISOString().slice(0, 10);
        return {
            aircraft: selected_aircraft,
            from: selected_from_date || dates[0] || today,
            to: selected_to_date || dates.at(-1) || today,
        };
    });
    const [state, set_state] = useState<ExportState>({ stage: "criteria" });
    const [date_error, set_date_error] = useState("");

    async function prepare() {
        set_state({ stage: "preparing" });
        try {
            const aircraft_UUID = aircraft_options.find((row) => row.registration === settings.aircraft)?.aircraft_UUID;
            if (settings.aircraft && !aircraft_UUID) {
                throw new Error("The selected aircraft is unavailable.");
            }
            const report = await logbook_service.prepare_export({
                ...(aircraft_UUID ? { aircraft_UUID } : {}),
                from: settings.from,
                to: settings.to,
            });
            set_state({ stage: "ready", report });
        } catch (cause) {
            if (cause instanceof ApiError && cause.status === 404 &&
                cause.message === "No logbook records match the export request") {
                set_state({ stage: "empty" });
            } else {
                const message = cause instanceof Error ? cause.message : "Could not prepare logbook records.";
                set_state({ stage: "failed", message });
            }
        }
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
        void prepare();
    }

    function open_report(report: PreparedExport) {
        try {
            logbook_service.download_export(report);
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
                        <p className="text-sm text-slate-600">Download the matching flight sectors and linked fuel transactions as a CSV file.</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <FormField label="Aircraft">
                                {(props) => (
                                    <select {...props} className={input_style} value={settings.aircraft}
                                        onChange={(event) => set_settings({ ...settings, aircraft: event.currentTarget.value })}>
                                        <option value="">All aircraft</option>
                                        {aircraft_options.map(({ aircraft_UUID, registration }) => <option key={aircraft_UUID} value={registration}>{registration}</option>)}
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
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4 sm:px-5">
                        <Button variant="secondary" className="mr-auto" onClick={on_close}>Cancel</Button>
                        <Button type="submit">Prepare report</Button>
                    </div>
                </form>
            ) : (
                <>
                    <div className="space-y-4 p-4 sm:px-5">
                        {stage === "preparing" && <p role="status" className="rounded-md bg-blue-100 p-3 text-sm text-blue-900">Preparing the selected logbook entries...</p>}
                        {stage === "ready" && <p role="status" className="rounded-md bg-emerald-100 p-3 text-sm text-emerald-900">Your report is ready.</p>}
                        {stage === "empty" && <p role="status" className="rounded-md bg-amber-100 p-3 text-sm text-amber-900">No entries match this aircraft and date range.</p>}
                        {(stage === "failed" || stage === "download_failed") && <p role="alert" className="rounded-md bg-red-100 p-3 text-sm text-red-900">{stage === "failed" ? state.message : "The download could not be completed. Try again."}</p>}
                        <div className="rounded-md bg-slate-100 p-4">
                            <DetailsList entries={[
                                { id: "aircraft", label: "Aircraft", value: settings.aircraft || "All aircraft" },
                                { id: "period", label: "Date range", value: `${entry_date(settings.from)} – ${entry_date(settings.to)}` },
                                { id: "format", label: "Format", value: "CSV" },
                                { id: "matches", label: "Matching entries", value: "report" in state ? state.report.total ?? "—" : stage === "empty" ? 0 : "—" },
                            ]} />
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4 sm:px-5">
                        <Button variant="secondary" className={stage === "ready" ? undefined : "mr-auto"} onClick={on_close}>{stage === "ready" ? "Close" : "Cancel"}</Button>
                        {stage === "preparing" && <Button is_loading>Preparing...</Button>}
                        {stage === "ready" && <Button onClick={() => open_report(state.report)}>
                            Download CSV
                        </Button>}
                        {(stage === "empty" || stage === "failed") && <Button variant="secondary" onClick={() => set_state({ stage: "criteria" })}>Change criteria</Button>}
                        {stage === "failed" && <Button onClick={prepare}>Try again</Button>}
                        {stage === "download_failed" && <Button onClick={() => open_report(state.report)}>Try again</Button>}
                    </div>
                </>
            )}
        </FormDialog>
    );
}
