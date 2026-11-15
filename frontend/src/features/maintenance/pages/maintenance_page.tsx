import { Activity, ClipboardCheck, FileText, History, Plus, Wrench } from "lucide-react";
import { useContext, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import SearchInput from "../../../shared/components/forms/search_input";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import DataTable from "../../../shared/components/ui/data_table";
import Pagination from "../../../shared/components/ui/pagination";
import useRecordHighlight from "../../../shared/hooks/use_record_highlight";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import type { PreviewRecord } from "../../../shared/types/record_types";
import { workspace_tab_style } from "../../../shared/styles/tab_styles";
import { AuthContext } from "../../auth/hooks/auth_context";
import { AircraftDocuments } from "../../aircraft/components/aircraft_record_tables";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import MaintenanceTable from "../components/maintenance_table";
import { MaintenanceWorkDetails, MaintenanceWorkDialog } from "../components/maintenance_work_dialog";
import { maintenance_store } from "../data/maintenance_store";
import useMaintenance from "../hooks/use_maintenance";
import { filter_maintenance_records } from "../utils/filter_maintenance_records";
import { format_work_date, work_button_style } from "../utils/maintenance_work";

const filter_style = "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8]";
const scoped_tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "work-history", label: "Work history", icon: History },
    { id: "cpcp", label: "CPCP tasks", icon: Wrench },
    { id: "compliance", label: "AD compliance", icon: ClipboardCheck },
    { id: "documents", label: "Documents", icon: FileText },
];

export default function MaintenancePage({ create_on_load = false }: { create_on_load?: boolean }) {
    const rows = useMaintenance();
    const highlight = useRecordHighlight();
    const aircraft = useAircraft();
    const navigate = useNavigate();
    const user = useContext(AuthContext)?.user;
    const [params, set_params] = useSearchParams();
    const [search, set_search] = useState("");
    const [creating, set_creating] = useState(create_on_load);
    const selected_record = rows.find((row) => row.id === params.get("record"));
    const selected = params.get("aircraft") ?? "";
    const part = params.get("part") ?? "";
    const status = params.get("status") ?? "";
    const date = params.get("date") ?? "";
    const scoped = params.get("view") === "work-history" && Boolean(selected);
    const scoped_aircraft = aircraft.find((row) => row.registration === selected);
    const tab = scoped_tabs.find((option) => option.id === params.get("tab")) ?? scoped_tabs[1];
    const task_view = Boolean(part || status) && !scoped;
    const aircraft_options = [...new Set([...aircraft.map((row) => row.registration), ...rows.map((row) => row.aircraft), selected].filter(Boolean))].sort();

    function set_filter(key: string, value: string) {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value);
        else next.delete(key);
        set_params(next, { replace: true });
    }

    const term = search.trim().toLowerCase();
    const records = filter_maintenance_records(
        rows, { aircraft: selected, part, status, date, term, task_view }, new Date(),
    );
    const { visible_rows, footer } = useTablePagination(
        records, JSON.stringify([term, selected, part, status, date, scoped]), undefined,
        records.findIndex((row) => row.id === highlight?.id),
    );
    const add_button = (
        <Button className={work_button_style} onClick={() => set_creating(true)}>
            <Plus size={16} aria-hidden="true" />
            Add work record
        </Button>
    );

    function close_dialog() {
        set_creating(false);
        if (selected_record) set_filter("record", "");
        if (create_on_load) {
            void navigate({ pathname: "/maintenance", search: params.toString() }, { replace: true });
        }
    }

    function save(record: Omit<PreviewRecord, "id">) {
        maintenance_store.save({ ...record, recorded_by: user?.username ?? "" });
        close_dialog();
        toast.success("Maintenance work record saved", { position: "bottom-right" });
    }

    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <WorkspaceBreadcrumbs
                current={scoped ? tab.label : "Maintenance"}
                parents={scoped ? [
                    { label: "Aircraft", to: "/aircraft" },
                    { label: selected, to: scoped_aircraft ? `/aircraft/${scoped_aircraft.id}` : undefined },
                ] : undefined}
            />
            <h1 id="page_title" className={scoped ? "text-2xl font-semibold text-[#0b2238]" : "sr-only"}>
                {scoped ? tab.id === "work-history" ? "Maintenance work history" : tab.label : "Maintenance"}
            </h1>
            <Card>
                {scoped ? (
                    <nav aria-label="Aircraft maintenance sections" className="mb-5 flex flex-wrap gap-1 border-b border-slate-200">
                        {scoped_tabs.map(({ id, label, icon: Icon }) => (
                            <Link key={id} to={`/maintenance?${new URLSearchParams({ aircraft: selected, view: "work-history", tab: id })}`}
                                aria-current={id === tab.id ? "page" : undefined}
                                className={workspace_tab_style(id === tab.id)}>
                                <Icon size={16} aria-hidden="true" /> {label}
                            </Link>
                        ))}
                    </nav>
                ) : (
                    <>
                        <h2 className="mb-4 font-semibold text-[#0b2238]">{task_view ? "Maintenance tasks" : "Work records"}</h2>
                        <div className="mb-4 grid items-end gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1.4fr)_1fr_1fr_auto]">
                            <div>
                                <p className="mb-1.5 text-sm font-normal text-slate-700">Search maintenance</p>
                                <SearchInput value={search} on_change={set_search} label="Search maintenance" placeholder="Work order or work performed" />
                            </div>
                            <label className="space-y-1.5 text-sm font-normal text-slate-700">
                                Aircraft
                                <select value={selected} onChange={(event) => set_filter("aircraft", event.currentTarget.value)} className={filter_style}>
                                    <option value="">All aircraft</option>
                                    {aircraft_options.map((registration) => <option key={registration}>{registration}</option>)}
                                </select>
                            </label>
                            {task_view ? (
                                <label className="space-y-1.5 text-sm font-normal text-slate-700">
                                    Status
                                    <select value={status} onChange={(event) => set_filter("status", event.currentTarget.value)} className={filter_style}>
                                        <option value="">All statuses</option>
                                        <option value="pending">Pending tasks</option>
                                        <option value="due">Due soon or overdue</option>
                                        {["Scheduled", "In Progress", "Completed"].map((value) => <option key={value}>{value}</option>)}
                                    </select>
                                </label>
                            ) : (
                                <label className="space-y-1.5 text-sm font-normal text-slate-700">
                                    Date performed
                                    <input type="date" value={date} onChange={(event) => set_filter("date", event.currentTarget.value)} className={filter_style} />
                                </label>
                            )}
                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                {(selected || part || status || date || term) && (
                                    <Button variant="ghost" onClick={() => { set_params({}); set_search(""); }}>
                                        Clear filters
                                    </Button>
                                )}
                                {add_button}
                            </div>
                        </div>
                        {part && <p className="mb-3 text-sm text-slate-600">Related part: <strong>{part}</strong></p>}
                    </>
                )}
                {scoped && tab.id === "overview" && <MaintenanceTable inventory rows={rows.filter((row) => row.aircraft === selected && row.status !== "Completed")} caption={`Next tasks for ${selected}`} />}
                {scoped && tab.id === "cpcp" && <p className="text-sm text-slate-600">No CPCP tasks are recorded for this aircraft.</p>}
                {scoped && tab.id === "compliance" && <p className="text-sm text-slate-600">No airworthiness directive compliance records are available for this aircraft.</p>}
                {scoped && tab.id === "documents" && <AircraftDocuments key={selected} registration={selected} />}
                {(!scoped || tab.id === "work-history") && (
                    <>
                        {scoped && <div className="mb-4 flex justify-end">{add_button}</div>}
                        {task_view ? <MaintenanceTable inventory rows={visible_rows} highlight_row={highlight} /> : (
                            <DataTable inventory caption={scoped ? "Maintenance work history" : "Maintenance work records"}
                                rows={visible_rows} get_row_key={(row) => row.id} highlight_row={highlight} empty_title="No maintenance work records"
                                columns={[
                                    { id: "date", header: "Date", render: (row) => format_work_date(row.performed_date) },
                                    ...(!scoped ? [{ id: "aircraft", header: "Aircraft", render: (row: PreviewRecord) => row.aircraft }] : []),
                                    { id: "order", header: "Work order", render: (row) => row.work_order || "Not recorded" },
                                    { id: "work", header: "Work performed", render: (row) => row.description || row.title },
                                    { id: "recorder", header: "Recorded by", render: (row) => row.recorded_by || row.performed_by || "Not recorded" },
                                    { id: "action", header: "Action", render: (row) => (
                                        <Button variant="ghost" className="whitespace-nowrap underline underline-offset-4" onClick={() => set_filter("record", row.id)}>View record</Button>
                                    ) },
                                ]}
                            />
                        )}
                        <Pagination {...footer} item_label="maintenance record" />
                    </>
                )}
            </Card>
            {creating && <MaintenanceWorkDialog aircraft_options={aircraft_options} fixed_aircraft={scoped ? selected : undefined}
                on_close={close_dialog} on_save={save} />}
            {selected_record && <MaintenanceWorkDetails record={selected_record} on_close={close_dialog} />}
        </section>
    );
}
