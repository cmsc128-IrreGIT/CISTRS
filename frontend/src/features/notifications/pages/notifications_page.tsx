import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
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
    const [filters_open, set_filters_open] = useState(false);
    const [is_saving, set_is_saving] = useState(false);
    const [now, set_now] = useState(() => new Date());
    const saving_ref = useRef(false);
    const reduce_motion = useReducedMotion();

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

    function clear_filters() {
        set_category("all");
        set_unread_only(false);
    }

    const total_unread_count = rows.filter(
        (row) => row.read_at === null,
    ).length;

    const category_rows = rows.filter(
        (row) => category === "all" || row.category === category,
    );

    const category_unread_count = category_rows.filter(
        (row) => row.read_at === null,
    ).length;

    const selected_category = notification_categories.find(
        (item) => item.key === category,
    )?.label;

    const visible = category_rows
        .filter((row) => !unread_only || row.read_at === null)
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
                        disabled={is_saving || total_unread_count === 0}
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
                <div className="mb-5 border-b border-slate-200 pb-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div
                            role="group"
                            aria-label="Notification read filter"
                            className="inline-flex shrink-0 gap-1 rounded-lg bg-slate-100 p-1"
                        >
                            {[
                                {
                                    label: "All",
                                    value: false,
                                    count: category_rows.length,
                                },
                                {
                                    label: "Unread",
                                    value: true,
                                    count: category_unread_count,
                                },
                            ].map((filter) => (
                                <button
                                    key={filter.label}
                                    type="button"
                                    aria-pressed={unread_only === filter.value}
                                    onClick={() =>
                                        set_unread_only(filter.value)
                                    }
                                    className={`min-h-11 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${
                                        unread_only === filter.value
                                            ? "bg-white text-red-700 shadow-sm"
                                            : "text-slate-500 hover:text-red-700"
                                    }`}
                                >
                                    {filter.label} ({filter.count})
                                </button>
                            ))}
                        </div>

                        <div className="flex max-w-full min-w-0 items-center">
                            <button
                                type="button"
                                aria-label="Features"
                                aria-expanded={filters_open}
                                aria-controls="notification_feature_filters"
                                onClick={() =>
                                    set_filters_open((previous) => !previous)
                                }
                                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                            >
                                <SlidersHorizontal
                                    size={16}
                                    aria-hidden="true"
                                />
                                Features
                                {!filters_open && category !== "all" && (
                                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                                        {selected_category}
                                    </span>
                                )}
                                <ChevronRight
                                    size={15}
                                    aria-hidden="true"
                                    className={`transition-transform motion-reduce:transition-none ${
                                        filters_open ? "rotate-180" : ""
                                    }`}
                                />
                            </button>

                            <motion.div
                                id="notification_feature_filters"
                                initial={false}
                                animate={{
                                    width: filters_open ? "auto" : 0,
                                    opacity: filters_open ? 1 : 0,
                                }}
                                transition={{
                                    duration: reduce_motion ? 0 : 0.2,
                                    ease: "easeOut",
                                }}
                                inert={!filters_open}
                                aria-hidden={!filters_open}
                                className="min-w-0 overflow-hidden"
                            >
                                <div className="overflow-x-auto p-1">
                                    <div
                                        role="group"
                                        aria-label="Notification category"
                                        className="flex w-max items-center gap-2 pl-2"
                                    >
                                        {notification_categories
                                            .filter(
                                                (item) => item.key !== "all",
                                            )
                                            .map((item) => {
                                                const count = rows.filter(
                                                    (row) =>
                                                        row.category ===
                                                        item.key,
                                                ).length;
                                                const is_selected =
                                                    category === item.key;

                                                return (
                                                    <button
                                                        key={item.key}
                                                        type="button"
                                                        aria-label={`${item.label} ${count}`}
                                                        aria-pressed={
                                                            is_selected
                                                        }
                                                        onClick={() =>
                                                            set_category(
                                                                (previous) =>
                                                                    previous ===
                                                                    item.key
                                                                        ? "all"
                                                                        : item.key,
                                                            )
                                                        }
                                                        className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-red-600 ${
                                                            is_selected
                                                                ? "border-red-700 bg-red-700 text-white"
                                                                : "border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                                        }`}
                                                    >
                                                        {item.label}
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 text-xs ${
                                                                is_selected
                                                                    ? "bg-white/15 text-white"
                                                                    : "bg-slate-100 text-slate-500"
                                                            }`}
                                                        >
                                                            {count}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {(category !== "all" || unread_only) && (
                            <div className="ml-auto">
                                <Button variant="ghost" onClick={clear_filters}>
                                    Clear filters
                                </Button>
                            </div>
                        )}
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                        {category === "all"
                            ? "All features"
                            : `${selected_category} notifications`}
                        {" · "}
                        {unread_only ? "Unread only" : "Read and unread"}
                    </p>
                </div>

                <p role="status" className="mb-4 text-xs text-slate-500">
                    {is_saving
                        ? "Updating notifications…"
                        : `${visible.length} shown · ${category_unread_count} unread in the selected scope`}
                </p>

                {groups.length === 0 ? (
                    <EmptyState
                        title="No notifications to show"
                        description={
                            unread_only
                                ? "No unread notifications match the selected filters."
                                : "No notifications match the selected feature."
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
