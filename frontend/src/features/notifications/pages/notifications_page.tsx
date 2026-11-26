import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Settings2 } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import Pagination from "../../../shared/components/ui/pagination";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import { button_styles } from "../../../shared/styles/button_styles";
import { useAuth } from "../../auth/hooks/auth_context";
import NotificationItem from "../components/notification_item";
import { notification_categories } from "../config/notification_categories";
import useNotifications from "../hooks/use_notifications";
import type { NotificationCategory } from "../types/notification_types";
import { notification_date_group } from "../utils/notification_time";

const group_order = [
    "Today",
    "Yesterday",
    "Earlier",
    "Other dates",
    "Date unavailable",
];
const route_features: Record<string, string> = {
    "/inventory": "Inventory",
    "/aircraft": "Aircraft",
    "/maintenance": "Maintenance",
    "/personnel": "Personnel",
    "/logbook": "Logbook",
};

export default function NotificationsPage() {
    const { user } = useAuth();
    return user && <Inbox key={user.account_UUID} features={user.features} />;
}

function Inbox({ features }: { features: string[] }) {
    const {
        notifications: inbox,
        loading,
        error,
        setRead,
        markAllRead,
        refresh,
    } = useNotifications();
    const categories = notification_categories.filter(
        ({ key, label }) =>
            key === "all" ||
            key === "system" ||
            features.includes(label) ||
            inbox.some((row) => row.category === key),
    );
    const [unread_only, set_unread_only] = useState(false);
    const [category, set_category] = useState<NotificationCategory | "all">(
        "all",
    );
    const [is_saving, set_is_saving] = useState(false);
    const [now, set_now] = useState(() => new Date());
    const saving_ref = useRef(false);

    useEffect(() => {
        const timer = window.setInterval(() => set_now(new Date()), 60_000);
        return () => window.clearInterval(timer);
    }, []);

    async function update_read(id?: string) {
        if (saving_ref.current) return;
        saving_ref.current = true;
        set_is_saving(true);

        try {
            if (id)
                await setRead(id, true); // Only mark as read (backend doesn't support unread)
            else await markAllRead(category === "all" ? undefined : category);
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Could not update notifications. Please try again.",
            );
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Could not update notifications. Please try again.",
            );
        } finally {
            saving_ref.current = false;
            set_is_saving(false);
        }
    }

    const rows = inbox;
    const category_rows = rows.filter(
        (row) => category === "all" || row.category === category,
    );
    const unread_rows = category_rows.filter((row) => row.read_at === null);
    const filtered = [...(unread_only ? unread_rows : category_rows)].sort(
        (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
    );
    const { visible_rows: visible, footer } = useTablePagination(
        filtered,
        JSON.stringify([unread_only, category]),
    );
    const groups = group_order
        .map((label) => ({
            label,
            rows: visible.filter(
                (row) => notification_date_group(row.created_at, now) === label,
            ),
        }))
        .filter((group) => group.rows.length > 0);
    const has_unread = category_rows.some((row) => row.read_at === null);
    const caught_up =
        !has_unread && rows.length > 0 && unread_only && category === "all";

    return (
        <section className="space-y-4" aria-labelledby="page_title">
            <WorkspaceBreadcrumbs current="Notifications" />
            <h1 id="page_title" className="sr-only">
                Notifications
            </h1>
            <div className="flex flex-wrap items-center justify-between gap-3">
                {loading && (
                    <span className="text-sm text-slate-600 animate-pulse">
                        Loading notifications…
                    </span>
                )}
                {!loading && !error && (
                    <p className="text-sm text-slate-600">
                        Notifications for your account.
                    </p>
                )}
                <div className="flex items-center gap-2">
                    <Link
                        to="/notifications/preferences"
                        className={button_styles("secondary")}
                    >
                        <Settings2 size={16} aria-hidden="true" /> Notification
                        preferences
                    </Link>
                </div>
            </div>
            <Card>
                <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
                    <div
                        role="group"
                        aria-label="Notification read filter"
                        className="inline-flex gap-1"
                    >
                        {[
                            {
                                label: "All",
                                unread: false,
                                count:
                                    loading || error
                                        ? "—"
                                        : category_rows.length,
                            },
                            {
                                label: "Unread",
                                unread: true,
                                count:
                                    loading || error ? "—" : unread_rows.length,
                            },
                        ].map((option) => (
                            <button
                                key={option.label}
                                type="button"
                                aria-pressed={unread_only === option.unread}
                                onClick={() => set_unread_only(option.unread)}
                                className={`min-h-10 cursor-pointer rounded-md px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-[#1d4ed8] ${unread_only === option.unread ? "bg-[#0b2238] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                            >
                                {option.label} ({option.count})
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <select
                            aria-label="Filter by feature"
                            value={category}
                            onChange={(event) => {
                                const selected = categories.find(
                                    ({ key }) =>
                                        key === event.currentTarget.value,
                                );
                                if (selected) set_category(selected.key);
                            }}
                            className="min-h-10 appearance-none rounded-md border border-slate-200 bg-slate-50 py-1 pl-3 pr-9 text-sm text-slate-700 focus-visible:outline-2 focus-visible:outline-[#1d4ed8]"
                        >
                            {categories.map(({ key, label }) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            size={15}
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-600"
                        />
                    </div>
                    <Button
                        variant="secondary"
                        className="sm:ml-auto"
                        disabled={is_saving || !has_unread || loading}
                        onClick={() => void update_read()}
                    >
                        <Check size={15} aria-hidden="true" /> Mark all as read
                    </Button>
                </div>
                {!loading && !error && (
                    <p role="status" className="sr-only">
                        {filtered.length} matching notifications.{" "}
                        {unread_rows.length} unread in the selected scope.
                    </p>
                )}

                {loading ? (
                    <ScreenLoading compact label="Loading notifications..." />
                ) : error ? (
                    <div role="alert" className="space-y-3">
                        <p className="text-sm text-red-700">{error}</p>
                        <Button variant="secondary" onClick={refresh}>
                            Try again
                        </Button>
                    </div>
                ) : groups.length ? (
                    <div className="space-y-4" aria-busy={is_saving}>
                        {groups.map(({ label, rows: group_rows }) => (
                            <section key={label} aria-label={label}>
                                <h2 className="mb-2 text-sm font-semibold text-[#0b2238]">
                                    {label}
                                </h2>
                                <ul className="space-y-2">
                                    {group_rows.map((row) => (
                                        <NotificationItem
                                            key={row.id}
                                            notification={
                                                row.to &&
                                                !features.includes(
                                                    route_features[row.to],
                                                )
                                                    ? { ...row, to: null }
                                                    : row
                                            }
                                            now={now}
                                            disabled={is_saving}
                                            on_mark_read={(id) =>
                                                void update_read(id)
                                            }
                                        />
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-1 py-2">
                        <h2 className="font-semibold text-[#0b2238]">
                            {caught_up
                                ? "All caught up"
                                : rows.length
                                  ? "No matching notifications"
                                  : "No notifications yet"}
                        </h2>
                        <p className="text-sm text-slate-600">
                            {caught_up
                                ? "All notifications are marked as read."
                                : rows.length
                                  ? "No notifications match the selected filters."
                                  : "There are no alerts for your assigned features."}
                        </p>
                    </div>
                )}
                {!loading && !error && (
                    <Pagination {...footer} item_label="notification" />
                )}
            </Card>
        </section>
    );
}
