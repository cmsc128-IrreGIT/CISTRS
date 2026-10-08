import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import PreviewNotice from "../../../shared/components/feedback/preview_notice";
import EmptyState from "../../../shared/components/feedback/empty_state";
import useNotifications from "../hooks/use_notifications";
import { notification_service } from "../services/notification_service";
import { notification_categories } from "../config/notification_categories";
import NotificationItem from "../components/notification_item";
import { notification_date_group } from "../utils/notification_time";
import type { NotificationCategory } from "../types/notification_types";

export default function NotificationsPage() {
    const rows = useNotifications();
    const [unread_only, set_unread_only] = useState(false);
    const [category, set_category] = useState<NotificationCategory | "all">(
        "all",
    );
    const [is_saving, set_is_saving] = useState(false);
    const saving_ref = useRef(false);
    const [now, set_now] = useState(() => new Date());
    useEffect(() => {
        const timer = window.setInterval(() => set_now(new Date()), 60_000);
        return () => window.clearInterval(timer);
    }, []);
    async function update_read(id?: string, is_read = true) {
        if (saving_ref.current) return;
        saving_ref.current = true;
        set_is_saving(true);
        try {
            if (id) await notification_service.set_read(id, is_read);
            else await notification_service.mark_all_read();
        } catch {
            toast.error("Could not update notifications. Please try again.");
        } finally {
            saving_ref.current = false;
            set_is_saving(false);
        }
    }
    const unread_count = rows.filter((row) => row.read_at === null).length;
    const visible = rows
        .filter(
            (row) =>
                (!unread_only || row.read_at === null) &&
                (category === "all" || row.category === category),
        )
        .sort(
            (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
        );
    const groups = [
        "Today",
        "Yesterday",
        "Earlier",
        "Other dates",
        "Date unavailable",
    ]
        .map((label) => ({
            label,
            rows: visible.filter(
                (row) => notification_date_group(row.created_at, now) === label,
            ),
        }))
        .filter((group) => group.rows.length > 0);
    return (
        <section className="space-y-5" aria-labelledby="page_title">
            <PageHeader
                title="Notifications"
                title_id="page_title"
                description="Updates about inventory, aircraft, and maintenance."
                actions={
                    <Button
                        variant="secondary"
                        disabled={is_saving || unread_count === 0}
                        onClick={() => void update_read()}
                    >
                        Mark all as read
                    </Button>
                }
            />
            <PreviewNotice>
                Sample notifications only · Email and SMS delivery are not
                connected.
            </PreviewNotice>
            <Card>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div
                        role="group"
                        aria-label="Notification read filter"
                        className="flex gap-1 rounded-lg bg-slate-100 p-1"
                    >
                        {[
                            { label: "All", value: false, count: rows.length },
                            {
                                label: "Unread",
                                value: true,
                                count: unread_count,
                            },
                        ].map((filter) => (
                            <button
                                key={filter.label}
                                type="button"
                                aria-pressed={unread_only === filter.value}
                                onClick={() => set_unread_only(filter.value)}
                                className={`min-h-11 rounded-md px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 ${unread_only === filter.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                            >
                                {filter.label} ({filter.count})
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="notification_category"
                            className="text-sm text-slate-600"
                        >
                            Category
                        </label>
                        <select
                            id="notification_category"
                            value={category}
                            onChange={(event) =>
                                set_category(
                                    event.currentTarget.value as
                                        NotificationCategory | "all",
                                )
                            }
                            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-2 focus:outline-slate-600"
                        >
                            {notification_categories.map((item) => (
                                <option key={item.key} value={item.key}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <p role="status" className="mb-4 text-xs text-slate-500">
                    {is_saving
                        ? "Updating notifications…"
                        : `${visible.length} notifications shown · ${unread_count} unread in total`}
                </p>
                {groups.length === 0 ? (
                    <EmptyState
                        title="No notifications to show"
                        description={
                            unread_only
                                ? "No unread notifications match this category."
                                : "No notifications match this category."
                        }
                        action={
                            category !== "all" || unread_only ? (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        set_category("all");
                                        set_unread_only(false);
                                    }}
                                >
                                    Clear filters
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="space-y-6">
                        {groups.map((group) => (
                            <section key={group.label} aria-label={group.label}>
                                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    {group.label}
                                </h2>
                                <ul className="space-y-1">
                                    {group.rows.map((row) => (
                                        <NotificationItem
                                            key={row.id}
                                            notification={row}
                                            now={now}
                                            disabled={is_saving}
                                            on_read_change={(id, is_read) =>
                                                void update_read(id, is_read)
                                            }
                                        />
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>
                )}
            </Card>
        </section>
    );
}
