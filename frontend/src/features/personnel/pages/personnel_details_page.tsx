import WorkspaceTabs from "../../../shared/components/navigation/workspace_tabs";
import { Activity, Award, Clock3, FileText, GraduationCap, HeartPulse, IdCard, Pencil, UserRound } from "lucide-react";
import { Link, Outlet, useParams, useSearchParams } from "react-router";
import EmptyState from "../../../shared/components/feedback/empty_state";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Card from "../../../shared/components/ui/card";
import DataTable from "../../../shared/components/ui/data_table";
import DetailsList from "../../../shared/components/ui/details_list";
import { button_styles } from "../../../shared/styles/button_styles";
import { workspace_tab_style } from "../../../shared/styles/tab_styles";
import PersonnelStatus from "../components/personnel_status";
import { usePersonnelDirectory } from "../hooks/use_personnel_directory";
import { is_pilot, personnel_date } from "../utils/personnel_records";

const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "licenses", label: "Licenses", icon: IdCard },
    { id: "training", label: "Training", icon: GraduationCap },
    { id: "medical", label: "Medical", icon: HeartPulse },
    { id: "competency", label: "Competency", icon: Award },
    { id: "flight-hours", label: "Flight Hours", icon: Clock3 },
];

export default function PersonnelDetailsPage() {
    const directory = usePersonnelDirectory();
    const { personnel_id } = useParams();
    const [params] = useSearchParams();
    const record = directory.rows.find((row) => row.id === personnel_id);
    const parents = [{ label: "Personnel", to: "/personnel" }];

    if (!record) {
        return (
            <section className="space-y-4">
                <WorkspaceBreadcrumbs parents={parents} current="Record not found" />
                <Card><EmptyState title="Personnel record not found"
                    action={<Link to="/personnel" className={button_styles("secondary")}>Return to personnel</Link>} /></Card>
            </section>
        );
    }

    const profile_path = `/personnel/${encodeURIComponent(record.id)}`;
    const visible_tabs = tabs.filter(({ id }) =>
        id === "overview" || (directory.full_access && (id !== "flight-hours" || is_pilot(record))));
    const active_tab = visible_tabs.find(({ id }) => id === params.get("tab")) ?? tabs[0];
    const overview = active_tab.id === "overview";
    const available = directory.availability.get(record.id);

    return (
        <section aria-labelledby="page_title" className="w-full min-w-0 space-y-4">
            <WorkspaceBreadcrumbs parents={overview ? parents : [...parents, { label: record.employee_number, to: profile_path }]}
                current={overview ? record.employee_number : active_tab.label} />
            <Card>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="min-w-0">
                            <h1 id="page_title" className="wrap-anywhere text-2xl font-semibold text-[#0b2238]">{record.name}</h1>
                            <p className="text-sm text-slate-600">{record.employee_number}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {directory.full_access && (
                            <Link to={`${profile_path}/documents`} className={button_styles("secondary")}>
                                <FileText size={16} aria-hidden="true" /> Documents
                            </Link>
                        )}
                        {directory.can_manage && <Link to={`${profile_path}/edit${overview ? "" : `?tab=${active_tab.id}`}`} className={button_styles("secondary")}>
                            <Pencil size={16} aria-hidden="true" /> Edit personnel
                        </Link>}
                    </div>
                </div>
            </Card>
            <Card>
                <WorkspaceTabs label="Personnel profile sections">
                    {visible_tabs.map(({ id, label, icon: Icon }) => (
                        <Link key={id} to={id === "overview" ? profile_path : `${profile_path}?tab=${id}`}
                            aria-current={id === active_tab.id ? "page" : undefined} className={workspace_tab_style(id === active_tab.id)}>
                            <Icon size={16} aria-hidden="true" /> {label}
                        </Link>
                    ))}
                </WorkspaceTabs>
                {record.preview && <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-slate-700">Preview record · Changes reset on reload.</p>}
                {overview ? (
                    <div className="space-y-4">
                        {directory.full_access && <div className="rounded-lg border border-slate-200 bg-white p-4">
                            <h2 className="mb-3 font-semibold text-[#0b2238]">Personal information</h2>
                            <div className="grid gap-5 md:grid-cols-[minmax(9rem,1fr)_minmax(0,2.5fr)]">
                                {record.photo ? (
                                    <img src={record.photo} alt={`${record.name}'s photo`} className="h-48 w-full rounded-lg object-contain" />
                                ) : (
                                    <div className="grid min-h-36 place-content-center justify-items-center gap-2 rounded-lg bg-slate-100 text-sm text-slate-600">
                                        <UserRound size={24} aria-hidden="true" />
                                        No photo available
                                    </div>
                                )}
                            <DetailsList entries={[
                                { id: "first_name", label: "First name", value: record.f_name || "Not recorded" },
                                { id: "middle_name", label: "Middle name", value: record.m_name || "Not recorded" },
                                { id: "last_name", label: "Last name", value: record.l_name || "Not recorded" },
                                { id: "suffix", label: "Suffix", value: record.suffix || "Not recorded" },
                                { id: "birth_date", label: "Date of birth", value: personnel_date(record.date_of_birth) },
                                { id: "sex", label: "Sex", value: record.sex || "Not recorded" },
                                { id: "blood_type", label: "Blood type", value: record.blood_type || "Not recorded" },
                            ]} />
                            </div>
                        </div>}
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                            <h2 className="mb-3 font-semibold text-[#0b2238]">Work information</h2>
                            <DetailsList entries={[
                                { id: "position", label: "Position", value: record.position || "Not recorded" },
                                { id: "department", label: "Department", value: record.department || "Not recorded" },
                                { id: "base", label: "Assigned base", value: record.base || "Not recorded" },
                                ...(directory.full_access ? [
                                    { id: "category", label: "Personnel category", value: record.category || "Not recorded" },
                                    { id: "hired", label: "Date hired", value: personnel_date(record.date_hired) },
                                    { id: "supervisor", label: "Supervisor", value: record.supervisor_name || directory.rows.find((row) => row.id === record.supervisor_emp_UUID)?.name || "Not recorded" },
                                    { id: "employment", label: "Employment status", value: <PersonnelStatus status={record.employment_status} /> },
                                    ...(record.record_status && record.record_status !== record.employment_status ? [
                                        { id: "status", label: "Record status", value: <PersonnelStatus status={record.record_status} /> },
                                    ] : []),
                                    { id: "email", label: "Work email", value: record.email || "Not recorded" },
                                    { id: "phone", label: "Contact number", value: record.phone || "Not recorded" },
                                ] : []),
                            ]} />
                        </div>
                        {directory.full_access && <div className="rounded-lg border border-slate-200 bg-white p-4">
                            <h2 className="mb-3 font-semibold text-[#0b2238]">Availability</h2>
                            <DetailsList entries={[
                                { id: "availability", label: "Last recorded availability", value: <PersonnelStatus availability status={available?.status} /> },
                                { id: "date", label: "Date", value: personnel_date(available?.date) },
                            ]} />
                        </div>}
                    </div>
                ) : active_tab.id === "licenses" ? (
                    <DataTable inventory bounded caption="Personnel licenses" rows={record.licenses}
                        get_row_key={(license) => license.emp_license_UUID} empty_title="No licenses recorded"
                        columns={[
                            { id: "type", header: "License type", render: (row) => row.license_type?.license_type_name || "Not recorded" },
                            { id: "number", header: "License number", render: (row) => row.license_number || "Not recorded" },
                            { id: "issued", header: "Date issued", render: (row) => personnel_date(row.date_issued) },
                            { id: "expiry", header: "Expiry date", render: (row) => personnel_date(row.expiry_date) },
                        ]} />
                ) : active_tab.id === "flight-hours" ? (
                    <EmptyState compact title="No monthly flight hours available" description="Flight-hour records are unavailable for this pilot." />
                ) : (
                    <EmptyState compact title={`No ${active_tab.label.toLowerCase()} records available`} />
                )}
            </Card>
            <Outlet context={directory} />
        </section>
    );
}
