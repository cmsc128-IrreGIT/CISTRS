import {
    CircleAlert,
    ClipboardCheck,
    List,
    Plane,
    Plus,
    Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import WorkspaceTabs from "../../../shared/components/navigation/workspace_tabs";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import SearchInput from "../../../shared/components/forms/search_input";
import LoadingState from "../../../shared/components/feedback/loading_state";
import ErrorState from "../../../shared/components/feedback/error_state";
import Card from "../../../shared/components/ui/card";
import Button from "../../../shared/components/ui/button";
import { button_styles } from "../../../shared/styles/button_styles";
import DataTable from "../../../shared/components/ui/data_table";
import Pagination from "../../../shared/components/ui/pagination";
import StatusBadge from "../../../shared/components/ui/status_badge";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import { workspace_tab_style } from "../../../shared/styles/tab_styles";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import AircraftStatusBadge from "../../aircraft/components/aircraft_status_badge";
import useMaintenanceRecords from "../hooks/use_maintenance_records";
import MaintenanceRecordDialog from "../components/maintenance_record_dialog";
import { maintenance_service } from "../services/maintenance_service";
import { maintenance_id } from "../types/maintenance_types";
import type {
    AircraftMaintenance,
    MaintenanceKind,
    MaintenanceRecord,
} from "../types/maintenance_types";

const tabs = [
    { id: "overview", label: "Overview", icon: List },
    { id: "ad-records", label: "AD Records", icon: ClipboardCheck },
    { id: "cpcp", label: "CPCP Tasks", icon: Wrench },
];
const input_style =
    "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8]";
type Editor = {
    kind: MaintenanceKind;
    record?: MaintenanceRecord;
    view?: boolean;
};

export default function MaintenancePage({
    create_on_load = false,
    edit_on_load = false,
}: {
    create_on_load?: boolean;
    edit_on_load?: boolean;
}) {
    const fleet = useAircraft();
    const data = useMaintenanceRecords();
    const [params, set_params] = useSearchParams();
    const { maintenance_id: route_id } = useParams();
    const navigate = useNavigate();
    const tab = tabs.some((row) => row.id === params.get("tab"))
        ? params.get("tab")!
        : "overview";
    const registration = params.get("aircraft") ?? "";
    const [search, set_search] = useState("");
    const [status, set_status] = useState("");
    const [editor, set_editor] = useState<Editor | null>(null);
    const [version, set_version] = useState(0);
    const all_records: MaintenanceRecord[] = [...data.ads, ...data.tasks];
    const aircraft = [
        ...fleet.map((row) => ({
            aircraft_UUID: row.aircraft_UUID,
            registration: row.registration,
            status: row.status,
            current_hours: Number(row.current_aircraft_hours),
        })),
        ...all_records.map((row) => row.aircraft),
    ]
        .filter(
            (row, index, rows) =>
                rows.findIndex(
                    (other) => other.aircraft_UUID === row.aircraft_UUID,
                ) === index,
        )
        .sort((a, b) => a.registration.localeCompare(b.registration));
    const aircraft_id = String(
        aircraft.find((row) => row.registration === registration)
            ?.aircraft_UUID ?? "",
    );
    const summary_request = useMemo(
        () => ({ tab, aircraft_id, version }),
        [tab, aircraft_id, version],
    );
    const [summary_result, set_summary_result] = useState<{
        request: typeof summary_request;
        summary: AircraftMaintenance | null;
        error: string;
    } | null>(null);

    useEffect(() => {
        if (summary_request.tab !== "overview" || !summary_request.aircraft_id)
            return;
        let active = true;
        maintenance_service
            .get_aircraft_maintenance(summary_request.aircraft_id)
            .then((summary) => {
                if (active)
                    set_summary_result({
                        request: summary_request,
                        summary,
                        error: "",
                    });
            })
            .catch((cause: unknown) => {
                if (!active) return;
                const error =
                    cause instanceof Error
                        ? cause.message
                        : "Could not load aircraft maintenance.";
                set_summary_result({
                    request: summary_request,
                    summary: null,
                    error,
                });
            });
        return () => {
            active = false;
        };
    }, [summary_request]);

    const current_summary =
        summary_result?.request === summary_request ? summary_result : null;
    const summary = current_summary?.summary ?? null;
    const summary_error = current_summary?.error ?? "";
    const summary_loading =
        tab === "overview" && Boolean(aircraft_id) && !current_summary;
    const route_record = route_id
        ? all_records.find((row) => maintenance_id(row) === route_id)
        : undefined;
    const active_editor: Editor | null = create_on_load
        ? { kind: params.get("kind") === "ad" ? "ad" : "cpcp" }
        : route_record
          ? {
                kind: "ad_UUID" in route_record ? "ad" : "cpcp",
                record: route_record,
                view: !edit_on_load,
            }
          : route_id
            ? null
            : editor;
    const source: MaintenanceRecord[] =
        tab === "ad-records"
            ? data.ads
            : tab === "cpcp"
              ? data.tasks
              : summary
                ? [...summary.ad_records, ...summary.cpcp_tasks]
                : all_records;
    const overview_records = source.filter(
        (row) => !registration || row.aircraft.registration === registration,
    );
    const term = search.trim().toLowerCase();
    const rows = overview_records.filter(
        (row) =>
            (!status || row.due_status === status) &&
            [
                row.aircraft.registration,
                "ad_UUID" in row
                    ? row.faa_ad_number + " " + row.subject
                    : row.task_reference + " " + (row.description ?? ""),
            ].some((text) => text.toLowerCase().includes(term)),
    );
    const { visible_rows, footer } = useTablePagination(
        rows,
        JSON.stringify([tab, registration, search, status]),
    );
    function close_editor() {
        set_editor(null);
        if (route_id || create_on_load) {
            const next = new URLSearchParams(params);
            next.delete("kind");
            void navigate(`/maintenance${next.size ? `?${next}` : ""}`, {
                replace: true,
            });
        }
    }
    function saved() {
        close_editor();
        data.reload();
        set_version((value) => value + 1);
    }
    function choose_aircraft(value: string) {
        const next = new URLSearchParams(params);
        if (value) next.set("aircraft", value);
        else next.delete("aircraft");
        set_params(next, { replace: true });
    }
    function open_create(kind: MaintenanceKind) {
        const next = new URLSearchParams(params);
        next.set("tab", kind === "ad" ? "ad-records" : "cpcp");
        next.set("kind", kind);
        void navigate(`/maintenance/new?${next}`);
    }
    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <WorkspaceBreadcrumbs current="Maintenance" />
            <h1 id="page_title" className="sr-only">
                Maintenance
            </h1>
            <Card>
                <WorkspaceTabs label="Maintenance sections">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <Link
                            key={id}
                            to={`/maintenance?${new URLSearchParams({ tab: id, ...(registration ? { aircraft: registration } : {}) })}`}
                            aria-current={tab === id ? "page" : undefined}
                            className={workspace_tab_style(tab === id)}
                        >
                            <Icon size={16} aria-hidden="true" />
                            {label}
                        </Link>
                    ))}
                </WorkspaceTabs>
                <div className="filter-toolbar mb-4 rounded-lg bg-slate-50 p-3">
                    <div className="filter-toolbar-search grid gap-1.5">
                        <p
                            aria-hidden="true"
                            className="text-sm text-slate-700"
                        >
                            Search maintenance
                        </p>
                        <SearchInput
                            label="Search maintenance"
                            value={search}
                            on_change={set_search}
                            placeholder="Aircraft, reference, or subject"
                        />
                    </div>
                    <label className="filter-toolbar-field grid gap-1.5 text-sm text-slate-700">
                        Aircraft
                        <select
                            value={registration}
                            onChange={(event) =>
                                choose_aircraft(event.currentTarget.value)
                            }
                            className={input_style}
                        >
                            <option value="">All aircraft</option>
                            {aircraft.map((row) => (
                                <option key={row.aircraft_UUID}>
                                    {row.registration}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="filter-toolbar-field grid gap-1.5 text-sm text-slate-700">
                        Due status
                        <select
                            value={status}
                            onChange={(event) =>
                                set_status(event.currentTarget.value)
                            }
                            className={input_style}
                        >
                            <option value="">All statuses</option>
                            {["Overdue", "Current", "Not Scheduled"].map(
                                (value) => (
                                    <option key={value}>{value}</option>
                                ),
                            )}
                        </select>
                    </label>
                    <div className="filter-toolbar-actions">
                        {(search || status || registration) && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    set_search("");
                                    set_status("");
                                    choose_aircraft("");
                                }}
                            >
                                Clear filters
                            </Button>
                        )}
                        {tab === "ad-records" && (
                            <Button
                                className={button_styles("primary")}
                                onClick={() => open_create("ad")}
                                disabled={!aircraft.length || data.loading}
                            >
                                <Plus size={16} />
                                Add AD record
                            </Button>
                        )}
                        {tab === "cpcp" && (
                            <Button
                                className={button_styles("primary")}
                                onClick={() => open_create("cpcp")}
                                disabled={!aircraft.length || data.loading}
                            >
                                <Plus size={16} />
                                Add CPCP task
                            </Button>
                        )}
                    </div>
                </div>
                {tab === "overview" && !data.loading && !data.error && (
                    <div className="mb-4 space-y-3">
                        {summary_loading ? (
                            <LoadingState message="Loading aircraft summary..." />
                        ) : summary_error ? (
                            <ErrorState
                                description={summary_error}
                                on_retry={() =>
                                    set_version((value) => value + 1)
                                }
                            />
                        ) : (
                            <>
                                <div
                                    className={`grid gap-3 ${summary ? "sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]" : "sm:grid-cols-3"}`}
                                >
                                    {summary && (
                                        <div className="flex min-h-16 min-w-0 items-center gap-2 rounded-lg border border-[#dbe3ed] px-2.5 py-2 text-xs font-medium text-[#0b2238]">
                                            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[#e9f0f8]">
                                                <Plane
                                                    size={16}
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <h2 className="font-semibold">
                                                    {
                                                        summary.aircraft
                                                            .registration
                                                    }
                                                </h2>
                                                <p className="mt-1 text-slate-600">
                                                    {summary.aircraft.current_hours.toLocaleString()}{" "}
                                                    flight hours
                                                </p>
                                            </div>
                                            <AircraftStatusBadge
                                                status={summary.aircraft.status}
                                            />
                                        </div>
                                    )}
                                    {[
                                        {
                                            label: "AD records",
                                            icon: ClipboardCheck,
                                            value: overview_records.filter(
                                                (row) => "ad_UUID" in row,
                                            ).length,
                                        },
                                        {
                                            label: "CPCP tasks",
                                            icon: Wrench,
                                            value: overview_records.filter(
                                                (row) => "cpcp_UUID" in row,
                                            ).length,
                                        },
                                        {
                                            label: "Overdue",
                                            icon: CircleAlert,
                                            value:
                                                summary?.overdue_count ??
                                                overview_records.filter(
                                                    (row) => row.overdue,
                                                ).length,
                                        },
                                    ].map(({ label, value, icon: Icon }) => {
                                        const danger =
                                            label === "Overdue" && value > 0;
                                        return (
                                            <div
                                                key={label}
                                                className={`flex min-h-16 min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium ${danger ? "border-[#e35860] bg-[#feedef] text-[#a81820]" : "border-[#dbe3ed] text-[#0b2238]"}`}
                                            >
                                                <span
                                                    className={`grid size-6 shrink-0 place-items-center rounded-md ${danger ? "" : "bg-[#e9f0f8]"}`}
                                                >
                                                    <Icon
                                                        size={16}
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    {label}
                                                </span>
                                                <span className="shrink-0 text-2xl font-bold leading-none tabular-nums">
                                                    {value}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}
                {data.loading ? (
                    <LoadingState message="Loading maintenance records..." />
                ) : data.error ? (
                    <ErrorState
                        description={data.error}
                        on_retry={data.reload}
                    />
                ) : (
                    <>
                        {route_id && !route_record && (
                            <p
                                role="status"
                                className="mb-3 text-sm text-slate-600"
                            >
                                This maintenance record was not found. Choose a
                                record below.
                            </p>
                        )}
                        <DataTable
                            inventory
                            caption={
                                tab === "overview"
                                    ? "Maintenance records"
                                    : tab === "ad-records"
                                      ? "AD records"
                                      : "CPCP tasks"
                            }
                            rows={visible_rows}
                            get_row_key={maintenance_id}
                            empty_title="No maintenance records found"
                            columns={[
                                {
                                    id: "aircraft",
                                    header: "Aircraft",
                                    render: (row) => row.aircraft.registration,
                                },
                                {
                                    id: "reference",
                                    header: "Reference / subject",
                                    render: (row) =>
                                        "ad_UUID" in row ? (
                                            <>
                                                <p className="font-semibold">
                                                    {row.faa_ad_number}
                                                </p>
                                                <p className="text-xs text-slate-600">
                                                    {row.subject}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-semibold">
                                                    {row.task_reference}
                                                </p>
                                                <p className="text-xs text-slate-600">
                                                    {row.description}
                                                </p>
                                            </>
                                        ),
                                },
                                {
                                    id: "date",
                                    header: "Next due date",
                                    render: (row) =>
                                        ("ad_UUID" in row
                                            ? row.next_due_date
                                            : row.due_date) || "Not scheduled",
                                },
                                {
                                    id: "hours",
                                    header: "Due hours",
                                    render: (row) =>
                                        ("ad_UUID" in row
                                            ? row.next_due_hours
                                            : row.due_hours) ?? "Not scheduled",
                                },
                                {
                                    id: "status",
                                    header: "Due status",
                                    render: (row) => (
                                        <StatusBadge
                                            tone={
                                                row.overdue
                                                    ? "danger"
                                                    : row.due_status ===
                                                        "Current"
                                                      ? "success"
                                                      : "neutral"
                                            }
                                        >
                                            {row.due_status}
                                        </StatusBadge>
                                    ),
                                },
                                {
                                    id: "action",
                                    header: "Action",
                                    render: (row) => (
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                className="min-h-8 font-semibold text-link"
                                                onClick={() =>
                                                    set_editor({
                                                        kind:
                                                            "ad_UUID" in row
                                                                ? "ad"
                                                                : "cpcp",
                                                        record: row,
                                                        view: true,
                                                    })
                                                }
                                            >
                                                View details
                                            </button>
                                        </div>
                                    ),
                                },
                            ]}
                        />
                        <Pagination {...footer} item_label="record" />
                    </>
                )}
            </Card>
            {active_editor && (
                <MaintenanceRecordDialog
                    key={
                        active_editor.record
                            ? maintenance_id(active_editor.record) +
                              String(active_editor.view)
                            : active_editor.kind
                    }
                    {...active_editor}
                    aircraft={aircraft}
                    on_edit={(record) => {
                        set_editor(null);
                        void navigate(
                            `/maintenance/${encodeURIComponent(maintenance_id(record))}/edit${params.size ? `?${params}` : ""}`,
                        );
                    }}
                    on_close={close_editor}
                    on_saved={saved}
                />
            )}
        </section>
    );
}
