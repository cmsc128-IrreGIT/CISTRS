import { useState } from "react";
import { Link, Outlet } from "react-router";
import { BookOpen, Download, Plus } from "lucide-react";
import SearchInput from "../../../shared/components/forms/search_input";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import Pagination from "../../../shared/components/ui/pagination";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import { button_styles } from "../../../shared/styles/button_styles";
import { workspace_tab_style } from "../../../shared/styles/tab_styles";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import LogbookExportDialog from "../components/logbook_export_dialog";
import LogbookTable from "../components/logbook_table";
import useLogbook from "../hooks/use_logbook";
import { logbook_breadcrumb_title, logbook_primary } from "../utils/logbook_entries";

const filter_style = "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8]";

export default function LogbookPage() {
    const rows = useLogbook();
    const fleet = useAircraft();
    const [export_open, set_export_open] = useState(false);
    const [search, set_search] = useState("");
    const [aircraft, set_aircraft] = useState("");
    const [date, set_date] = useState("");
    const term = search.trim().toLowerCase();
    const aircraft_options = [...new Set([
        ...fleet.map((row) => row.registration), ...rows.map((row) => row.aircraft),
    ].filter(Boolean))].sort();
    const filtered = rows.filter((row) =>
        (!aircraft || row.aircraft === aircraft) &&
        (!date || row.entry_date === date) &&
        [row.log_page, row.defects, row.action_taken, row.aircraft, row.station_from, row.station_to, row.commander_name]
            .some((value) => value.toLowerCase().includes(term)),
    ).sort((first, second) =>
        second.entry_date.localeCompare(first.entry_date) ||
        (second.entry_time || "").localeCompare(first.entry_time || ""),
    );
    const is_filtered = Boolean(term || aircraft || date);
    const { visible_rows, footer } = useTablePagination(filtered, JSON.stringify([term, aircraft, date]), 10);

    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <WorkspaceBreadcrumbs current={logbook_breadcrumb_title} />
            <h1 id="page_title" className="sr-only">{logbook_breadcrumb_title}</h1>
            <Card>
                <nav aria-label="Logbook sections" className="mb-4 flex border-b border-slate-200">
                    <Link to="/logbook" aria-current="page" className={workspace_tab_style(true)}>
                        <BookOpen size={16} aria-hidden="true" />
                        Logbook Entries
                    </Link>
                </nav>
                <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-3">
                    <div className="min-w-0 flex-1 basis-56">
                        <p className="mb-1.5 text-sm text-slate-700">Search entries</p>
                        <SearchInput label="Search entries" value={search} on_change={set_search} placeholder="Reference or remarks" />
                    </div>
                    <label className="min-w-32 flex-1 basis-32 space-y-1.5 text-sm text-slate-700">
                        Aircraft
                        <select className={filter_style} value={aircraft} onChange={(event) => set_aircraft(event.currentTarget.value)}>
                            <option value="">All aircraft</option>
                            {aircraft_options.map((registration) => <option key={registration}>{registration}</option>)}
                        </select>
                    </label>
                    <label className="min-w-36 flex-1 basis-36 space-y-1.5 text-sm text-slate-700">
                        Entry date
                        <input type="date" className={filter_style} value={date} onChange={(event) => set_date(event.currentTarget.value)} />
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                        {is_filtered && (
                            <Button variant="ghost" onClick={() => { set_search(""); set_aircraft(""); set_date(""); }}>
                                Clear filters
                            </Button>
                        )}
                        <Button variant="secondary" onClick={() => set_export_open(true)}>
                            <Download size={16} aria-hidden="true" />
                            Export records
                        </Button>
                        <Link to="/logbook/new" className={button_styles("primary", logbook_primary)}>
                            <Plus size={16} aria-hidden="true" />
                            Add entry
                        </Link>
                    </div>
                </div>
                <LogbookTable rows={visible_rows} is_filtered={is_filtered} />
                {filtered.length > footer.default_page_size && <Pagination {...footer} item_label="entry" plural_label="entries" />}
            </Card>
            {export_open && (
                <LogbookExportDialog rows={rows} aircraft_options={aircraft_options}
                    selected_aircraft={aircraft} selected_date={date} on_close={() => set_export_open(false)} />
            )}
            <Outlet />
        </section>
    );
}
