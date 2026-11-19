import { CalendarDays, RefreshCw } from "lucide-react";
import { useState, useMemo } from "react";
import { Navigate } from "react-router";
import { toast } from "sonner";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import Pagination from "../../../shared/components/ui/pagination";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import { useAuth } from "../../auth/hooks/auth_context";
import PersonnelTabs from "../components/personnel_tabs";
import PersonnelStatus from "../components/personnel_status";
import RecordAvailabilityDialog from "../components/record_availability_dialog";
import useAvailability from "../hooks/use_availability";
import { availability_service } from "../services/personnel_service";
import { availability_statuses } from "../types/availability_types";
import type { AvailabilityValues } from "../types/availability_types";
import { usePersonnelRecords } from "../hooks/use_personnel_directory";
import { personnel_date } from "../utils/personnel_records";

type RegisterRow = { id: string; name: string; position: string; recorded?: { status: string; date: string; updated_at: string } };

const filter_style = "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8]";
const updated_format = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const columns: TableColumn<RegisterRow>[] = [
    { id: "personnel", header: "Personnel", render: (row) => row.name },
    { id: "status", header: "Recorded availability", render: (row) => <PersonnelStatus availability status={row.recorded?.status as "Available" | "Unavailable" | "Not recorded"} /> },
    { id: "period", header: "Period", render: (row) => row.recorded ? personnel_date(row.recorded.date) : "—" },
    { id: "updated", header: "Last updated", render: (row) => {
        const value = Date.parse(row.recorded?.updated_at ?? "");
        return Number.isFinite(value) ? updated_format.format(value) : "—";
    } },
];

function local_today() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export default function AvailabilityPage() {
    const { user } = useAuth();
    const directory_access = Boolean(user?.features.includes("Personnel"));
    const can_record = Boolean(user?.features.includes("Availability"));
    // The Availability tab is for recording. All other staff can see the
    // current status in the read-only Personnel directory.
    if (!can_record) return <Navigate to="/personnel" replace />;

    return <AvailabilityRegister key={user?.account_UUID} account_id={user?.account_UUID}
        directory_access={directory_access} can_record={can_record} />;
}

function AvailabilityRegister({ account_id, directory_access, can_record }: {
    account_id?: string;
    directory_access: boolean;
    can_record: boolean;
}) {
    const [today] = useState(local_today);
    const [date, set_date] = useState(today);
    const [position, set_position] = useState("");
    const [status, set_status] = useState("");
    const [is_open, set_is_open] = useState(false);
    const [saving, set_saving] = useState(false);
    // Use real employee records for both full Personnel users and Availability-only
    // recorders. The latter access only the limited staff-directory endpoint.
    const directory = usePersonnelRecords(account_id ?? "", Boolean(account_id), directory_access);
    const personnel = directory.rows.map(({ id, name, position }) => ({ id, name, position }));
    const { records, loading: availLoading, error: availError, refresh } = useAvailability();
    const selected_date = date || today;
    const daily_records = new Map(records.filter((row) => row.date === selected_date).map((row) => [row.personnel, row]));
    const positions = [...new Set(personnel.map((row) => row.position).filter(Boolean))].sort();
    const rows = useMemo(() => personnel.map(({ id, name, position }) => ({ id, name, position, recorded: daily_records.get(id) }))
        .filter((row) => (!position || row.position === position) &&
            (!status || (row.recorded?.status || "Not recorded") === status)), [personnel, daily_records, position, status]);
    const { visible_rows, footer } = useTablePagination(rows, JSON.stringify([selected_date, position, status]));

    async function save(values: AvailabilityValues) {
        if (saving) return;
        set_saving(true);
        try {
            // Check if record already exists for this personnel and date
            const existing = daily_records.get(values.personnel);
            // Only "Available" | "Unavailable" are valid for saving (not "Not recorded")
            const saveStatus = values.status === "Not recorded" ? "Available" : values.status;
            if (existing) {
                await availability_service.update(existing.id, { status: saveStatus, notes: values.notes });
            } else {
                await availability_service.save({
                    emp_UUID: values.personnel,
                    date: values.date,
                    status: saveStatus,
                    notes: values.notes,
                });
            }
            await refresh();
            set_date(values.date);
            if (status && status !== values.status) set_status("");
            if (position && personnel.find(({ id }) => id === values.personnel)?.position !== position) set_position("");
            set_is_open(false);
            toast.success("Availability updated", { position: "bottom-right" });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save availability");
        } finally {
            set_saving(false);
        }
    }

    return (
        <section className="space-y-4" aria-labelledby="page_title">
            <WorkspaceBreadcrumbs parents={[{ label: "Personnel", to: "/personnel" }]} current="Availability" />
            <h1 id="page_title" className="sr-only">Personnel availability</h1>
            <Card>
                <PersonnelTabs active="availability" />
                <div className="filter-toolbar mb-4 rounded-lg bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="filter-toolbar-field grid gap-1.5 text-sm text-slate-700">
                            Date
                            <input type="date" className={filter_style} value={date}
                                onChange={(event) => set_date(event.currentTarget.value)} />
                        </label>
                        <label className="filter-toolbar-field grid gap-1.5 text-sm text-slate-700">
                            Position
                            <select className={filter_style} value={position} onChange={(event) => set_position(event.currentTarget.value)}>
                                <option value="">All positions</option>
                                {positions.map((option) => <option key={option}>{option}</option>)}
                            </select>
                        </label>
                        <label className="filter-toolbar-field grid gap-1.5 text-sm text-slate-700">
                            Availability
                            <select className={filter_style} value={status} onChange={(event) => set_status(event.currentTarget.value)}>
                                <option value="">All statuses</option>
                                {availability_statuses.map((option) => <option key={option}>{option}</option>)}
                            </select>
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                        {can_record && (
                            <Button className="bg-[#0b2238]! hover:bg-[#193951]!" disabled={!personnel.length || directory.loading || Boolean(directory.error) || saving}
                                onClick={() => set_is_open(true)}>
                                <CalendarDays size={16} aria-hidden="true" /> Record availability
                            </Button>
                        )}
                        <Button variant="ghost" onClick={refresh} disabled={availLoading || saving} aria-label="Refresh availability">
                            <RefreshCw size={16} aria-hidden="true" className={availLoading ? "animate-spin" : ""} />
                        </Button>
                    </div>
                </div>
                {directory.error ? (
                    <p role="alert" className="text-sm text-red-700">
                        Personnel options are unavailable. <Button variant="ghost" onClick={directory.reload}>Retry</Button>
                    </p>
                ) : directory.loading || availLoading ? <ScreenLoading label="Loading personnel…" /> : availError ? (
                    <p role="alert" className="text-sm text-red-700">
                        Failed to load availability: {availError}
                        <Button variant="ghost" onClick={refresh} className="ml-2">Retry</Button>
                    </p>
                ) : (
                    <>
                        <h2 className="mb-3 font-semibold text-[#0b2238]">Staff availability · {personnel_date(selected_date)}</h2>
                        <DataTable inventory caption="Personnel availability" columns={columns}
                            rows={visible_rows} get_row_key={(row) => row.id} empty_title="No matching personnel" />
                        {rows.length > footer.default_page_size && <Pagination {...footer} item_label="person" plural_label="people" />}
                    </>
                )}
            </Card>
            {can_record && is_open && <RecordAvailabilityDialog date={selected_date} people={personnel} records={records}
                on_close={() => set_is_open(false)} on_save={save} />}
        </section>
    );
}
