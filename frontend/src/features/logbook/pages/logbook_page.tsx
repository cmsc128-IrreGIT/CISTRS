import WorkspaceTabs from "../../../shared/components/navigation/workspace_tabs";
import { useMemo, useState } from "react";
import { Link, Outlet } from "react-router";
import { BookOpen, Download, Plus } from "lucide-react";
import SearchInput from "../../../shared/components/forms/search_input";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import ErrorState from "../../../shared/components/feedback/error_state";
import LoadingState from "../../../shared/components/feedback/loading_state";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import Pagination from "../../../shared/components/ui/pagination";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import { button_styles } from "../../../shared/styles/button_styles";
import { workspace_tab_style } from "../../../shared/styles/tab_styles";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import LogbookExportDialog from "../components/logbook_export_dialog";
import LogbookTable from "../components/logbook_table";
import { useLogbookData } from "../hooks/use_logbook";
import type { LogbookAircraft } from "../types/logbook_types";
import { logbook_breadcrumb_title, logbook_primary } from "../utils/logbook_entries";

const filter_style = "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8]";

export default function LogbookPage() {
    const { records, is_loading, error, reload } = useLogbookData();
    const fleet = useAircraft();
    const [export_open, set_export_open] = useState(false);
    const [search, set_search] = useState("");
    const [aircraft, set_aircraft] = useState("");
    const [from_date, set_from_date] = useState("");
    const [to_date, set_to_date] = useState("");
    const known_aircraft = useMemo(() => [
        ...fleet.map((row) => ({ aircraft_UUID: row.aircraft_UUID, registration: row.registration, status: row.status.status_name, current_hours: row.current_hours })),
        ...records.map((row) => row.aircraft),
    ].filter((row, index, all) => all.findIndex((candidate) => candidate.aircraft_UUID === row.aircraft_UUID) === index)
        .sort((first, second) => first.registration.localeCompare(second.registration)), [fleet, records]);
    const aircraft_options = known_aircraft.filter((row): row is LogbookAircraft => Boolean(row.aircraft_UUID));
    const term = search.trim().toLowerCase();
    const filtered = records.filter((row) =>
        (!aircraft || row.aircraft.registration === aircraft) &&
        (!from_date || row.flight_date >= from_date) &&
        (!to_date || row.flight_date <= to_date) &&
        [row.route, row.aircraft.registration, row.flight_status.status_name, row.flight_type.type_name, row.pic.f_name, row.pic.l_name, row.delay_cause ?? ""]
            .some((value) => value.toLowerCase().includes(term)),
    ).sort((first, second) =>
        second.flight_date.localeCompare(first.flight_date) || (second.std ?? "").localeCompare(first.std ?? ""),
    );
    const is_filtered = Boolean(term || aircraft || from_date || to_date);
    const { visible_rows, footer } = useTablePagination(filtered, JSON.stringify([term, aircraft, from_date, to_date]));

    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <WorkspaceBreadcrumbs current={logbook_breadcrumb_title} />
            <h1 id="page_title" className="sr-only">{logbook_breadcrumb_title}</h1>
            <Card>
                <WorkspaceTabs label="Logbook sections">
                    <Link to="/logbook" aria-current="page" className={workspace_tab_style(true)}>
                        <BookOpen size={16} aria-hidden="true" /> Logbook Entries
                    </Link>
                </WorkspaceTabs>
                <div className="filter-toolbar mb-4 rounded-lg bg-slate-50 p-3">
                    <div className="filter-toolbar-search grid gap-1.5">
                        <p aria-hidden="true" className="text-sm text-slate-700">Search entries</p>
                        <SearchInput label="Search entries" value={search} on_change={set_search} placeholder="Route, aircraft, pilot, or delay" />
                    </div>
                    <label className="filter-toolbar-field grid gap-1.5 text-sm text-slate-700">
                        Aircraft
                        <select className={filter_style} value={aircraft} onChange={(event) => set_aircraft(event.currentTarget.value)}>
                            <option value="">All aircraft</option>
                            {aircraft_options.map((row) => <option key={row.aircraft_UUID} value={row.registration}>{row.registration}</option>)}
                        </select>
                    </label>
                    <label className="filter-toolbar-field grid gap-1.5 text-sm text-slate-700">
                        From date
                        <input type="date" className={filter_style} value={from_date} max={to_date || undefined} onChange={(event) => set_from_date(event.currentTarget.value)} />
                    </label>
                    <label className="filter-toolbar-field grid gap-1.5 text-sm text-slate-700">
                        To date
                        <input type="date" className={filter_style} value={to_date} min={from_date || undefined} onChange={(event) => set_to_date(event.currentTarget.value)} />
                    </label>
                    <div className="filter-toolbar-actions">
                        {is_filtered && <Button variant="ghost" onClick={() => { set_search(""); set_aircraft(""); set_from_date(""); set_to_date(""); }}>Clear filters</Button>}
                        <Button variant="secondary" onClick={() => set_export_open(true)} disabled={!records.length}>
                            <Download size={16} aria-hidden="true" /> Export records
                        </Button>
                        <Link to="/logbook/new" className={button_styles("primary", logbook_primary)}>
                            <Plus size={16} aria-hidden="true" /> Add flight
                        </Link>
                    </div>
                </div>
                {is_loading ? <LoadingState message="Loading logbook entries…" /> : error ? (
                    <ErrorState description={error} on_retry={reload} />
                ) : <LogbookTable rows={visible_rows} is_filtered={is_filtered} />}
                {!is_loading && !error && <Pagination {...footer} item_label="entry" plural_label="entries" />}
            </Card>
            {export_open && <LogbookExportDialog rows={records} aircraft_options={aircraft_options} selected_aircraft={aircraft} selected_from_date={from_date} selected_to_date={to_date} on_close={() => set_export_open(false)} />}
            <Outlet />
        </section>
    );
}
