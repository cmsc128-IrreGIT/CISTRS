import { CalendarDays } from "lucide-react";
import { useState } from "react";
import type { SubmitEvent } from "react";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import FormDialog from "../../../shared/components/ui/form_dialog";
import { INVENTORY_FORM_INPUT } from "../../inventory/constants/inventory_form_constants";
import { logbook_service } from "../services/logbook_service";
import type { LogbookAircraft, LogbookEntry } from "../types/logbook_types";

export default function LogbookExportDialog({
    rows,
    aircraft_options,
    selected_aircraft,
    selected_from_date,
    selected_to_date,
    on_close,
}: {
    rows: LogbookEntry[];
    aircraft_options: LogbookAircraft[];
    selected_aircraft: string;
    selected_from_date: string;
    selected_to_date: string;
    on_close: () => void;
}) {
    const dates = rows.map((row) => row.flight_date).filter(Boolean).sort();
    const today = new Date().toISOString().slice(0, 10);
    const [aircraft, set_aircraft] = useState(selected_aircraft);
    const [from, set_from] = useState(selected_from_date || dates[0] || today);
    const [to, set_to] = useState(selected_to_date || dates.at(-1) || today);
    const [error, set_error] = useState("");
    const [saving, set_saving] = useState(false);

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        set_error("");
        if (from > to) {
            set_error("To date must be on or after the from date.");
            return;
        }
        set_saving(true);
        try {
            const aircraft_UUID = aircraft_options.find((row) => row.registration === aircraft)?.aircraft_UUID;
            await logbook_service.export_records({
                ...(aircraft_UUID ? { aircraft_UUID } : {}),
                from,
                to,
            });
            on_close();
        } catch (cause) {
            set_error(cause instanceof Error ? cause.message : "Could not export logbook records.");
        } finally {
            set_saving(false);
        }
    }

    return <FormDialog title="Export logbook records" compact on_close={on_close} is_busy={saving}>
        <form onSubmit={submit}>
            <div className="space-y-4 p-4 sm:px-5">
                <p className="text-sm text-slate-600">Download the matching flight sectors and linked fuel transactions as a CSV file.</p>
                {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
                <FormField label="Aircraft">
                    {(props) => <select {...props} className={INVENTORY_FORM_INPUT} value={aircraft} onChange={(event) => set_aircraft(event.currentTarget.value)}>
                        <option value="">All aircraft</option>
                        {aircraft_options.map((row) => <option key={row.aircraft_UUID} value={row.registration}>{row.registration}</option>)}
                    </select>}
                </FormField>
                <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="From date" required>
                        {(props) => <div className="relative"><input {...props} name="from" type="date" required value={from} onChange={(event) => set_from(event.currentTarget.value)} className={`${INVENTORY_FORM_INPUT} pr-10`} /><CalendarDays size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-600" /></div>}
                    </FormField>
                    <FormField label="To date" required>
                        {(props) => <div className="relative"><input {...props} name="to" type="date" required value={to} onChange={(event) => set_to(event.currentTarget.value)} className={`${INVENTORY_FORM_INPUT} pr-10`} /><CalendarDays size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-600" /></div>}
                    </FormField>
                </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4 sm:px-5">
                <Button type="button" variant="secondary" onClick={on_close} disabled={saving}>Cancel</Button>
                <Button type="submit" is_loading={saving}>Download CSV</Button>
            </div>
        </form>
    </FormDialog>;
}
