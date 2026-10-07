import { useState } from "react";
import { Link } from "react-router";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import StatusBadge from "../../../shared/components/ui/status_badge";
import PreviewNotice from "../../../shared/components/feedback/preview_notice";
import EmptyState from "../../../shared/components/feedback/empty_state";
import useNotifications from "../hooks/use_notifications";
import { notifications_store } from "../data/notifications_store";

export default function NotificationsPage() {
    const rows = useNotifications();
    const [unread_only, set_unread_only] = useState(false);
    const visible = rows.filter(
        (row) => !unread_only || row.is_read === "false",
    );
    return (
        <section className="space-y-5" aria-labelledby="page_title">
            <PageHeader
                title="Notifications"
                title_id="page_title"
                actions={
                    <Button
                        variant="secondary"
                        disabled={!rows.some((row) => row.is_read === "false")}
                        onClick={() =>
                            rows
                                .filter((row) => row.is_read === "false")
                                .forEach((row) =>
                                    notifications_store.save(
                                        { ...row, is_read: "true" },
                                        row.id,
                                    ),
                                )
                        }
                    >
                        Mark all as read
                    </Button>
                }
            />
            <PreviewNotice>
                Static sample alerts · No automatic alert generation, email, or
                text delivery.
            </PreviewNotice>
            <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
                <input
                    type="checkbox"
                    checked={unread_only}
                    onChange={(event) =>
                        set_unread_only(event.currentTarget.checked)
                    }
                />
                Unread only
            </label>
            {visible.length === 0 && (
                <Card>
                    <EmptyState title="No notifications to show" />
                </Card>
            )}
            {visible.map((row) => (
                <Card key={row.id}>
                    <div className="flex flex-wrap justify-between gap-3">
                        <div>
                            <h2 className="font-semibold">{row.title}</h2>
                            <p className="mt-2 text-sm text-slate-600">
                                {row.message}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                                <time dateTime={row.created_at}>
                                    {new Date(row.created_at).toLocaleString()}
                                </time>
                            </p>
                        </div>
                        <StatusBadge
                            tone={row.is_read === "true" ? "neutral" : "info"}
                        >
                            {row.is_read === "true" ? "Read" : "Unread"}
                        </StatusBadge>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                        <Link
                            to={row.to}
                            className="text-sm text-slate-600 underline underline-offset-4"
                        >
                            View record
                        </Link>
                        <Button
                            variant="ghost"
                            onClick={() =>
                                notifications_store.save(
                                    {
                                        ...row,
                                        is_read:
                                            row.is_read === "true"
                                                ? "false"
                                                : "true",
                                    },
                                    row.id,
                                )
                            }
                        >
                            Mark as {row.is_read === "true" ? "unread" : "read"}
                        </Button>
                    </div>
                </Card>
            ))}
        </section>
    );
}
