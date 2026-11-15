import { Bell, Check, Clock3, MailOpen, Package, Plane, Wrench } from "lucide-react";
import { Link } from "react-router";
import Button from "../../../shared/components/ui/button";
import type { NotificationRecord } from "../types/notification_types";
import { notification_relative_time } from "../utils/notification_time";

const category_icons = {
    inventory: Package,
    maintenance: Wrench,
    aircraft: Plane,
    personnel: Clock3,
    system: Bell,
};

export default function NotificationItem({ notification, now, disabled, can_open, on_read_change }: {
    notification: NotificationRecord;
    now: Date;
    disabled: boolean;
    can_open: boolean;
    on_read_change: (id: string, is_read: boolean) => void;
}) {
    const unread = notification.read_at === null;
    const Icon = category_icons[notification.category];
    const ReadIcon = unread ? Check : MailOpen;
    const date = new Date(notification.created_at);
    const timestamp = Number.isFinite(date.getTime()) ? date.toLocaleString() : "Date unavailable";

    const read_action = unread ? "Mark as read" : "Mark as unread";

    return (
        <li className={`flex min-w-0 items-start gap-3 rounded-lg border border-slate-100 px-3 py-2.5 ${unread ? "bg-blue-50/50" : "bg-white"}`}>
            <span className={`relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${unread ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"}`}>
                <Icon size={17} aria-hidden="true" />
                {unread && <span aria-hidden="true" className="absolute right-0 bottom-0 size-2 rounded-full bg-blue-700 ring-2 ring-white" />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
                <h3 className={`wrap-anywhere text-sm text-[#0b2238] ${unread ? "font-semibold" : "font-medium"}`}>
                    {notification.to && can_open ? (
                        <Link to={notification.record_id ? `${notification.to}#record=${encodeURIComponent(notification.record_id)}` : notification.to}
                            className="rounded-sm underline decoration-slate-400 underline-offset-4 hover:text-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-[#1d4ed8]">
                            {notification.title}
                        </Link>
                    ) : notification.title}
                </h3>
                <p className="mt-0.5 wrap-anywhere text-sm text-slate-600">{notification.message}</p>
                <span className="sr-only">{unread ? "Unread" : "Read"}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <time dateTime={notification.created_at} title={timestamp} aria-label={timestamp}
                    className="max-w-[5.5rem] text-right text-xs text-slate-600 tabular-nums sm:max-w-28">
                    {notification_relative_time(notification.created_at, now)}
                </time>
                <Button variant="ghost" className="size-10! min-h-10! p-0! text-slate-600! hover:bg-slate-200/60! hover:text-[#0b2238]!"
                    title={read_action} aria-label={`${read_action}: ${notification.title}`}
                    disabled={disabled} onClick={() => on_read_change(notification.id, unread)}>
                    <ReadIcon size={16} aria-hidden="true" />
                </Button>
            </div>
        </li>
    );
}
