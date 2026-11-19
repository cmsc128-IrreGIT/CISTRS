import { ChevronDown, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import DataTable from "../../../shared/components/ui/data_table";
import Pagination from "../../../shared/components/ui/pagination";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import DetailsList from "../../../shared/components/ui/details_list";
import LogbookStatusBadge from "./logbook_status_badge";
import { button_styles } from "../../../shared/styles/button_styles";
import type { LogbookEntry } from "../types/logbook_types";
import { employee_name, entry_date, entry_time } from "../utils/logbook_entries";
import LogbookFuelDialog from "./logbook_fuel_dialog";

export default function LogbookDetails({ entry }: { entry: LogbookEntry }) {
    const [fuel_editor, set_fuel_editor] = useState<{ transaction?: LogbookEntry["fuel_transactions"][number] } | null>(null);
    const { visible_rows: fuel_rows, footer: fuel_footer } = useTablePagination(entry.fuel_transactions, entry.sector_UUID);
    return <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 className="wrap-anywhere text-lg font-semibold text-[#0b2238]">{entry.route}</h2>
                <p className="text-sm text-slate-600">{entry.aircraft.registration} · {entry.flight_date}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <LogbookStatusBadge status={entry.flight_status.status_name} />
                <Link to={`/logbook/${entry.sector_UUID}/edit`} className={button_styles("secondary")}>
                    <Pencil size={16} aria-hidden="true" /> Edit entry
                </Link>
            </div>
        </div>
        <section aria-label="Flight summary" className="rounded-lg border border-slate-200 bg-white p-4">
            <DetailsList entries={[
                { id: "date", label: "Flight date", value: entry_date(entry.flight_date) },
                { id: "route", label: "Route", value: entry.route },
                { id: "aircraft", label: "Aircraft", value: entry.aircraft.registration },
                { id: "type", label: "Flight type", value: entry.flight_type.type_name },
                { id: "status", label: "Flight status", value: <LogbookStatusBadge status={entry.flight_status.status_name} /> },
                { id: "day_night", label: "Day / night", value: entry.day_night ?? "Not recorded" },
                { id: "pic", label: "Pilot in command", value: `${employee_name(entry.pic)} (${entry.pic.emp_number})` },
                { id: "sic", label: "Second in command", value: entry.sic ? `${employee_name(entry.sic)} (${entry.sic.emp_number})` : "Not recorded" },
                { id: "observer", label: "Observer", value: entry.observer ? `${employee_name(entry.observer)} (${entry.observer.emp_number})` : "Not recorded" },
                { id: "entered_by", label: "Entered by", value: `${employee_name(entry.entered_by)} (${entry.entered_by.emp_number})` },
                { id: "flight_time", label: "Flight time", value: entry.flight_time === null ? "Not recorded" : `${entry.flight_time} h` },
                { id: "pax", label: "Passengers", value: entry.pax_count },
            ]} />
        </section>
        <details className="group mt-3 rounded-lg border border-slate-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg p-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#1d4ed8] [&::-webkit-details-marker]:hidden">
                Additional Flight Information <ChevronDown size={16} aria-hidden="true" className="transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-slate-200 p-4">
                <DetailsList entries={[
                    ...(["std", "sta", "off_block", "airborne", "touchdown", "on_block"] as const).map((key) => ({ id: key, label: key.replaceAll("_", " ").toUpperCase(), value: entry_time(entry[key]) === "Not recorded" ? "Not recorded" : `${entry_time(entry[key])} UTC` })),
                    { id: "fuel_dep", label: "Fuel at departure", value: entry.fuel_departure === null ? "Not recorded" : `${entry.fuel_departure} ${entry.fuel_unit ?? ""}`.trim() },
                    { id: "fuel_arr", label: "Fuel at arrival", value: entry.fuel_arrival === null ? "Not recorded" : `${entry.fuel_arrival} ${entry.fuel_unit ?? ""}`.trim() },
                    { id: "fuel_used", label: "Fuel used", value: entry.fuel_used === null ? "Not recorded" : `${entry.fuel_used} ${entry.fuel_unit ?? ""}`.trim() },
                    { id: "delay", label: "Delay category", value: entry.delay_category?.category_name ?? "Not recorded" },
                    { id: "cause", label: "Delay cause", value: entry.delay_cause ?? "Not recorded" },
                    { id: "qa", label: "QA check status", value: entry.qa_check_status ?? "Not recorded" },
                ]} />
            </div>
        </details>
        <div className="mt-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[#0b2238]">Fuel Transactions</h3>
                <Button variant="secondary" onClick={() => set_fuel_editor({})}><Plus size={15} aria-hidden="true" /> Add fuel entry</Button>
            </div>
            <DataTable inventory caption="Fuel transactions" rows={fuel_rows}
                get_row_key={(row) => row.fuel_transaction_UUID} empty_title="No fuel transactions recorded"
                columns={[
                    { id: "date", header: "Date", render: (row) => row.transaction_date },
                    { id: "type", header: "Type", render: (row) => row.transaction_type },
                    { id: "quantity", header: "Quantity", render: (row) => `${row.quantity_gal} gal` },
                    { id: "recipient", header: "Issued to", render: (row) => employee_name(row.issued_to) },
                    { id: "recorder", header: "Recorded by", render: (row) => employee_name(row.recorded_by) },
                    { id: "remarks", header: "Remarks", render: (row) => row.remarks || "Not recorded" },
                    { id: "action", header: "Action", render: (row) => <Button variant="ghost" onClick={() => set_fuel_editor({ transaction: row })}>Edit</Button> },
                ]} />
            <Pagination {...fuel_footer} item_label="transaction" />
        </div>
        {fuel_editor && <LogbookFuelDialog
            sector_UUID={entry.sector_UUID}
            flight_date={entry.flight_date}
            transaction={fuel_editor.transaction}
            on_close={() => set_fuel_editor(null)}
            on_saved={() => {
                set_fuel_editor(null);
                toast.success("Fuel transaction saved", { position: "bottom-right" });
            }}
        />}
    </Card>;
}
