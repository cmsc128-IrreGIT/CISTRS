import {
  BookOpen,
  CalendarDays,
  CircleAlert,
  ClipboardCheck,
  Package,
  Plane,
  TriangleAlert,
  Wrench,
  Users,
} from "lucide-react";
import { Fragment } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth/hooks/auth_context";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import StatusBadge from "../../../shared/components/ui/status_badge";
import { employee_name } from "../../../shared/utils/employee_name";
import { get_inventory_access, get_workspace } from "../../../shared/components/navigation/workspace";
import { INVENTORY_REQUESTS_PATH } from "../../inventory/constants/inventory_constants";
import { useInventoryRequestPreviews } from "../../inventory/hooks/use_inventory_request_previews";
import AircraftStatusCard from "../components/aircraft_status_card";
import DashboardDate from "../components/dashboard_date";
import DashboardOverview, {
  type DashboardSummary,
} from "../components/dashboard_overview";
import DashboardPanel from "../components/dashboard_panel";
import PendingMaintenanceCard from "../components/pending_maintenance_card";
import RecentActivityTable from "../components/recent_activity_table";
import StockAlertsCard from "../components/out_of_stock_card";
import {
  dashboard_list_limit,
  get_dashboard_config,
} from "../config/dashboard_config";
import useDashboardSummary from "../hooks/use_dashboard_summary";
import usePilotReminders from "../hooks/use_pilot_reminders";
import "../dashboard.css";

const retry_style =
  "mt-4 min-h-10 min-w-36 rounded-md bg-[#0b2238] px-5 text-sm font-semibold text-white hover:bg-[#183953]";

const stock_actions: Record<string, string> = {
  ISSUE: "Issued",
  RECEIVE: "Received",
  RECEIPT: "Received",
  RETURN: "Returned",
  ADJUSTMENT: "Adjusted",
  TRANSFER: "Transferred",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const workspace = get_workspace(user);
  const features = user?.features ?? [];
  const can_manage_inventory = get_inventory_access(user) === "manage";
  const config = get_dashboard_config(workspace, features, can_manage_inventory);
  const request_previews = useInventoryRequestPreviews();
  const open_requests = request_previews.filter(({ kind, status }) => kind === "RESTOCK" && status === "PENDING");
  const uses_inventory = config.panels.includes("stock");
  const uses_availability = config.panels.includes("availability");
  const can_view_availability = features.includes("Availability");
  const can_read_availability = features.includes("Personnel");
  const summary = useDashboardSummary(
    uses_inventory,
    uses_availability && can_read_availability ? user?.emp_UUID : undefined,
  );
  const reminders = usePilotReminders(
    (workspace === "pilot" || workspace === "pilot_mechanic") &&
      uses_availability &&
      features.includes("Personnel")
      ? user?.emp_UUID
      : undefined,
  );
  const { inventory, transactions } = summary;
  const failed =
    (uses_inventory && inventory.error && transactions.error) ||
    reminders.error;

  function retry() {
    if (uses_inventory && inventory.error) void inventory.reload();
    if (uses_inventory && transactions.error) void transactions.reload();
    if (reminders.error) reminders.reload();
  }

  if (failed) {
    return (
      <section
        aria-labelledby="dashboard_unavailable"
        role="alert"
        className="dashboard grid min-h-72 place-items-center rounded-xl bg-white px-6 py-12 text-center"
      >
        <div>
          <h2 id="dashboard_unavailable" className="text-xl font-bold">
            We couldn’t load your records
          </h2>
          <p className="mt-4 text-sm text-slate-600">
            Please try again. You can still use the navigation.
          </p>
          <button type="button" onClick={retry} className={retry_style}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (reminders.loading) return <ScreenLoading label="Loading dashboard…" />;

  const availability = summary.current_availability?.status;
  const dated_licences = [...reminders.licences]
    .filter((row) => row.expiry_date)
    .sort((first, second) =>
      (first.expiry_date ?? "").localeCompare(second.expiry_date ?? ""),
    );
  const licence =
    dated_licences.find(
      (row) =>
        new Date(`${row.expiry_date?.slice(0, 10)}T00:00:00`) >= summary.today,
    ) ?? dated_licences.at(-1);
  const expiry = licence?.expiry_date;
  const days_until_expiry = expiry
    ? Math.round(
        (Date.parse(`${expiry.slice(0, 10)}T00:00:00`) -
          summary.today.getTime()) /
          86_400_000,
      )
    : Number.NaN;
  const metrics = {
    inventory: {
      label: "Inventory items",
      value: inventory.is_loading
        ? "Loading…"
        : inventory.error
          ? "Unavailable"
          : inventory.items.length,
      icon: Package,
      to: "/inventory",
    },
    stock: {
      label: "Stock alerts",
      value: inventory.is_loading
        ? "Loading…"
        : inventory.error
          ? "Unavailable"
          : summary.stock_alerts.length,
      icon: CircleAlert,
      to: "/inventory",
      tone: summary.stock_alerts.length ? "warning" : undefined,
    },
    aircraft: {
      label: "Aircraft",
      value: summary.aircraft_state.loading ? "Loading..." : summary.aircraft_state.error ? "Unavailable" : summary.aircraft_count,
      icon: Plane,
      to: "/aircraft",
    },
    pending: {
      label: "Pending maintenance",
      value: summary.maintenance_state.loading ? "Loading..." : summary.maintenance_state.error ? "Unavailable" : summary.pending_maintenance.length,
      icon: Wrench,
      to: "/maintenance",
      hint: "AD records and CPCP tasks with a due date or aircraft-hour limit",
    },
    due: {
      label: "Due soon",
      value: summary.maintenance_state.loading ? "Loading..." : summary.maintenance_state.error ? "Unavailable" : summary.due_count,
      icon: TriangleAlert,
      tone: summary.due_count ? "danger" : undefined,
      to: "/maintenance",
      hint: "Overdue work and tasks due within 30 days",
    },
    requests: {
      label: "Open stock requests",
      value: open_requests.length,
      icon: ClipboardCheck,
      to: INVENTORY_REQUESTS_PATH,
    },
    work: {
      label: "Accomplishment records",
      value: summary.maintenance_state.loading ? "Loading..." : summary.maintenance_state.error ? "Unavailable" : summary.completed_work.length,
      icon: Wrench,
      to: "/maintenance",
    },
    availability: {
      label: "My availability",
      value: (
        <StatusBadge
          tone={
            availability === "Available"
              ? "success"
              : availability
                ? "warning"
                : "neutral"
          }
        >
          {summary.availability_state.loading ? "Loading..." : summary.availability_state.error || !summary.availability_state.enabled ? "Unavailable" : availability || "Not recorded"}
        </StatusBadge>
      ),
      icon: CalendarDays,
      to: can_view_availability ? "/personnel/availability" : undefined,
    },
    staff_availability: {
      label: "Personnel availability",
      icon: CalendarDays,
      to: "/personnel/availability",
    },
    checklists: {
      label: "Flight checklists",
      value: "Unavailable",
      icon: ClipboardCheck,
      tone: "warning",
    },
    personnel: {
      label: "Personnel",
      value: summary.personnel_state.loading ? "Loading..." : summary.personnel_state.error ? "Unavailable" : summary.personnel_count,
      icon: Users,
      to: "/personnel",
    },
    logbook: {
      label: "Logbook entries",
      value: summary.logbook_state.is_loading ? "Loading..." : summary.logbook_state.error ? "Unavailable" : summary.recent_logbook.length,
      icon: BookOpen,
      to: "/logbook",
    },
  } satisfies Record<(typeof config.metrics)[number], DashboardSummary>;

  const panels = {
    stock: inventory.is_loading ? (
      <DashboardPanel title="Stock alerts">
        <ScreenLoading compact label="Loading inventory…" />
      </DashboardPanel>
    ) : inventory.error ? (
      <DashboardPanel title="Stock alerts">
        <div role="alert">
          <p className="text-sm text-slate-600">
            Inventory could not be loaded.
          </p>
          <button
            type="button"
            className={retry_style}
            onClick={() => void inventory.reload()}
          >
            Retry inventory
          </button>
        </div>
      </DashboardPanel>
    ) : (
      <StockAlertsCard items={summary.stock_alerts} />
    ),
    logbook: (
      <DashboardPanel
        title="Recent logbook entries"
        footer={{ label: "View logbook", to: "/logbook" }}
      >
        {summary.logbook_state.is_loading ? <ScreenLoading compact label="Loading logbook..." /> : summary.logbook_state.error ? <div role="alert"><p className="text-sm text-red-700">{summary.logbook_state.error}</p><button type="button" className={retry_style} onClick={() => void summary.logbook_state.reload()}>Retry logbook</button></div> : summary.recent_logbook.length ? (
          <ul className="space-y-2">
            {summary.recent_logbook
              .slice(0, dashboard_list_limit)
              .map((row) => (
                <li
                  key={row.sector_UUID}
                  className="rounded-md bg-[#f4f7fa] p-2.5 text-sm"
                >
                  <p className="font-semibold">{row.aircraft.registration} · {row.route}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    <DashboardDate value={row.flight_date} />
                  </p>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">No logbook entries recorded.</p>
        )}
      </DashboardPanel>
    ),
    aircraft: <AircraftStatusCard data={summary.aircraft_status_data} loading={summary.aircraft_state.loading} error={summary.aircraft_state.error} on_retry={summary.aircraft_state.reload} />,
    maintenance: (
      <PendingMaintenanceCard
        maintenance={summary.pending_maintenance}
        loading={summary.maintenance_state.loading}
        error={summary.maintenance_state.error}
        on_retry={summary.maintenance_state.reload}
      />
    ),
    requests: (
      <DashboardPanel
        title="Stock requests"
        footer={{ label: "View requests", to: INVENTORY_REQUESTS_PATH }}
      >
        <p className="rounded-md bg-[#f4f7fa] p-2.5 text-sm text-slate-600">
          {open_requests.length === 0
            ? "No open restock requests in this session."
            : `${open_requests.length} open restock ${open_requests.length === 1 ? "request" : "requests"} in this session.`}
        </p>
      </DashboardPanel>
    ),
    work: (
      <DashboardPanel
        title="Recent maintenance"
        footer={{
          label: "View maintenance",
          to: "/maintenance",
        }}
      >
        {summary.maintenance_state.loading ? <ScreenLoading compact label="Loading maintenance..." /> : summary.maintenance_state.error ? <div role="alert"><p className="text-sm text-red-700">{summary.maintenance_state.error}</p><button type="button" className={retry_style} onClick={summary.maintenance_state.reload}>Retry maintenance</button></div> : summary.completed_work.length ? (
          <ul className="space-y-2">
            {summary.completed_work
              .slice(0, dashboard_list_limit)
              .map((row) => (
                <li
                  key={row.id}
                  className="rounded-md bg-[#f4f7fa] p-2.5 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link
                      to={`/maintenance/${row.id}`}
                      className="font-semibold text-link"
                    >
                      {row.title}
                    </Link>
                    <StatusBadge tone="success">Accomplishment recorded</StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{row.aircraft}</p>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">No maintenance accomplishments recorded.</p>
        )}
      </DashboardPanel>
    ),
    availability: (
      <DashboardPanel
        title="My availability & reminders"
        footer={
          can_view_availability
            ? { label: "Manage availability", to: "/personnel/availability" }
            : undefined
        }
      >
        <div className="space-y-2 text-sm">
          {summary.availability_state.error && <div role="alert"><p className="text-red-700">{summary.availability_state.error}</p><button type="button" className={retry_style} onClick={summary.availability_state.reload}>Retry availability</button></div>}
          <div className="rounded-md bg-[#f4f7fa] p-2.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="font-semibold">Availability</span>
              {metrics.availability.value}
            </div>
            <p className="mt-1 text-xs text-slate-600">
              <DashboardDate
                value={
                  summary.current_availability?.date ??
                  summary.today.toISOString()
                }
              />
            </p>
          </div>
          <div className="rounded-md bg-[#f4f7fa] p-2.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="font-semibold">Licence renewal</span>
              {expiry && days_until_expiry <= 30 && (
                <StatusBadge
                  tone={days_until_expiry < 0 ? "danger" : "warning"}
                >
                  {days_until_expiry < 0 ? "Expired" : "Expires soon"}
                </StatusBadge>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {expiry ? (
                <>
                  {licence.license_type.license_type_name} ·{" "}
                  <DashboardDate value={expiry} />
                </>
              ) : (
                "No renewal date recorded."
              )}
            </p>
          </div>
        </div>
      </DashboardPanel>
    ),
  };
  const activity = {
    inventory: {
      to: "/inventory/history",
      rows: uses_inventory
        ? summary.recent_changes.map((row) => {
            const type = row.transaction_type.toUpperCase();
            const part = row.status.part;
            const action = stock_actions[type] ?? row.transaction_type;
            return {
              id: row.transaction_UUID,
              date: row.created_at,
              activity: (
                <Link
                  to={`/inventory/${part.part_UUID}`}
                  className="text-link"
                >
                  {action} {Math.abs(row.quantity_change)} {part.part_name}
                </Link>
              ),
              reference: part.part_number || row.transaction_UUID,
              processed_by: row.updater ? employee_name(row.updater) : undefined,
            };
          })
        : [],
    },
    maintenance: {
      to: "/maintenance",
      rows: summary.completed_work.map((row) => ({
        id: row.id,
        date: row.accomplished_date,
        activity: (
          <Link to={`/maintenance/${row.id}`} className="text-link">
            {row.title}
          </Link>
        ),
        reference: row.aircraft,
        processed_by: row.recorded_by?.trim() || row.performed_by,
      })),
    },
    logbook: {
      to: "/logbook",
      rows: summary.recent_logbook.map((row) => ({
        id: row.sector_UUID,
        date: row.flight_date,
        activity: `Logbook flight ${row.route}`,
        reference: row.aircraft.registration,
        processed_by: employee_name(row.entered_by),
      })),
    },
  }[config.activity];
  const activity_loading = config.activity === "maintenance" ? summary.maintenance_state.loading
    : config.activity === "logbook" ? summary.logbook_state.is_loading : uses_inventory && transactions.is_loading;
  const activity_error = config.activity === "maintenance" ? summary.maintenance_state.error
    : config.activity === "logbook" ? summary.logbook_state.error : uses_inventory ? transactions.error : "";
  function retry_activity() {
    if (config.activity === "maintenance") summary.maintenance_state.reload();
    else if (config.activity === "logbook") void summary.logbook_state.reload();
    else void transactions.reload();
  }

  return (
    <section
      aria-labelledby="page_title"
      className="dashboard @container space-y-3.5"
    >
      <h1 id="page_title" className="sr-only">
        Dashboard
      </h1>
      {config.metrics.length > 0 && (
        <DashboardOverview
          summaries={config.metrics.map((key) => metrics[key])}
          today={summary.today}
        />
      )}
      {config.panels.length > 0 && (
        <div
          className={`dashboard-grid ${uses_inventory && config.panels.length === 3 ? "dashboard-inventory-layout" : ""}`}
        >
          {config.panels.map((key) => (
            <Fragment key={key}>{panels[key]}</Fragment>
          ))}
        </div>
      )}
      {activity_loading || activity_error ? (
        <DashboardPanel title="Recent activity">
          {activity_loading ? (
            <ScreenLoading compact label="Loading activity…" />
          ) : (
            <div role="alert">
              <p className="text-sm text-slate-600">
                Activity could not be loaded.
              </p>
              <button
                type="button"
                className={retry_style}
                onClick={retry_activity}
              >
                Retry activity
              </button>
            </div>
          )}
        </DashboardPanel>
      ) : (
        <RecentActivityTable
          rows={activity.rows}
          history_to={
            config.activity !== "inventory" || (uses_inventory && can_manage_inventory)
              ? activity.to
              : undefined
          }
        />
      )}
    </section>
  );
}
