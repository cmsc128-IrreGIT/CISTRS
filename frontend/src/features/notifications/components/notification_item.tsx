import { Bell, Check, MailOpen, Package, Plane, Wrench } from "lucide-react";
import { Link } from "react-router";
import type { NotificationRecord } from "../types/notification_types";
import { notification_relative_time } from "../utils/notification_time";
const category_icons = {
    inventory: Package,
    maintenance: Wrench,
    aircraft: Plane,
    system: Bell,
};
function record_label(to: string) {
    if (to.startsWith("/inventory/")) return "View inventory item";
    if (to.startsWith("/inventory")) return "View inventory";
    if (to.startsWith("/maintenance")) return "View maintenance";
    if (to.startsWith("/logbook")) return "View logbook";
    if (to.startsWith("/aircraft")) return "View aircraft";
    return "View related record";
}
export default function NotificationItem({
    notification,
    now,
    disabled,
    on_read_change,
}: {
    notification: NotificationRecord;
    now: Date;
    disabled: boolean;
    on_read_change: (id: string, is_read: boolean) => void;
}) {
    const is_unread = notification.read_at === null;
    const Icon = category_icons[notification.category];
    const exact_time = new Date(notification.created_at);
    const formatted_time = Number.isFinite(exact_time.getTime())
        ? exact_time.toLocaleString()
        : "Date unavailable";
    return (
        <li
            className={`flex items-start gap-3 rounded-lg px-3 py-4 sm:px-4 ${is_unread ? "bg-slate-50" : "bg-white"}`}
        >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                <Icon size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <h3
                        className={`break-words text-sm text-slate-900 ${is_unread ? "font-semibold" : "font-medium"}`}
                    >
                        {notification.title}
                    </h3>
                    <time
                        dateTime={notification.created_at}
                        title={formatted_time}
                        aria-label={formatted_time}
                        className="shrink-0 text-xs text-slate-500"
                    >
                        {notification_relative_time(
                            notification.created_at,
                            now,
                        )}
                    </time>
                </div>
                <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                    {notification.message}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        {is_unread && (
                            <span
                                aria-hidden="true"
                                className="size-1.5 rounded-full bg-slate-600"
                            />
                        )}
                        {is_unread ? "Unread" : "Read"}
                    </span>
                    {notification.to && (
                        <Link
                            to={notification.to}
                            className="inline-flex min-h-11 items-center rounded-sm text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
                        >
                            {record_label(notification.to)}
                        </Link>
                    )}
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                            on_read_change(notification.id, is_unread)
                        }
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:cursor-wait disabled:opacity-50"
                    >
                        {is_unread ? (
                            <Check size={15} aria-hidden="true" />
                        ) : (
                            <MailOpen size={15} aria-hidden="true" />
                        )}
                        Mark as {is_unread ? "read" : "unread"}
                        <span className="sr-only">: {notification.title}</span>
                    </button>
                </div>
            </div>
        </li>
    );
}
