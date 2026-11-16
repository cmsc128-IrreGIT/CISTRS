import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Settings2 } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { get_inventory_access } from "../../../shared/components/navigation/workspace";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import { button_styles } from "../../../shared/styles/button_styles";
import { useAuth } from "../../auth/hooks/auth_context";
import NotificationItem from "../components/notification_item";
import { notification_categories } from "../config/notification_categories";
import useNotifications from "../hooks/use_notifications";
import { notification_service } from "../services/notification_service";
import type { NotificationCategory } from "../types/notification_types";
import { notification_date_group } from "../utils/notification_time";

const group_order = ["Today", "Yesterday", "Earlier", "Other dates", "Date unavailable"];

export default function NotificationsPage() {
    const { user } = useAuth();
    return user && <Inbox key={user.account_UUID} account_id={user.account_UUID} features={user.features}
        can_view_stock_history={get_inventory_access(user) === "manage"} />;
}

function Inbox({ account_id, features, can_view_stock_history }: {
    account_id: string; features: string[]; can_view_stock_history: boolean;
}) {
    const inbox = useNotifications(account_id);
    const categories = notification_categories.filter(({ key, label }) =>
        key === "all" || key === "system" || features.includes(label),
    );
    const rows = inbox.filter((row) =>
        categories.some(({ key }) => key === row.category) &&
        (row.to !== "/inventory/history" || can_view_stock_history),
    );
    const [unread_only, set_unread_only] = useState(false);
    const [category, set_category] = useState<NotificationCategory | "all">("all");
    const [is_saving, set_is_saving] = useState(false);
    const [now, set_now] = useState(() => new Date());
    const saving_ref = useRef(false);

    useEffect(() => {
        const timer = window.setInterval(() => set_now(new Date()), 60_000);
        return () => window.clearInterval(timer);
    }, []);

    async function update_read(id?: string, is_read = true) {
        if (saving_ref.current) return;
        saving_ref.current = true;
        set_is_saving(true);

        try {
            const service = notification_service(account_id);
            if (id) await service.set_read(id, is_read);
            else await service.mark_all_read();
        } catch {
            toast.error("Could not update notifications. Please try again.");
        } finally {
            saving_ref.current = false;
            set_is_saving(false);
        }
    }

    const category_rows = rows.filter((row) => category === "all" || row.category === category);
    const unread_rows = category_rows.filter((row) => row.read_at === null);
    const visible = [...(unread_only ? unread_rows : category_rows)].sort(
        (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
    );
    const groups = group_order.map((label) => ({
        label,
        rows: visible.filter((row) => notification_date_group(row.created_at, now) === label),
    })).filter((group) => group.rows.length > 0);
    const has_unread = rows.some((row) => row.read_at === null);
    const caught_up = !has_unread && rows.length > 0 && unread_only && category === "all";

    return (
        <section className="space-y-4" aria-labelledby="page_title">
            <WorkspaceBreadcrumbs current="Notifications" />
            <h1 id="page_title" className="sr-only">Notifications</h1>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">Preview inbox. Read changes are kept for this browser session.</p>
                <Link to="/notifications/preferences" className={button_styles("secondary")}>
                    <Settings2 size={16} aria-hidden="true" /> Notification preferences
                </Link>
            </div>
            <Card>
                <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
                    <div role="group" aria-label="Notification read filter" className="inline-flex gap-1">
                        {[
                            { label: "All", unread: false, count: category_rows.length },
                            { label: "Unread", unread: true, count: unread_rows.length },
                        ].map((option) => (
                            <button key={option.label} type="button" aria-pressed={unread_only === option.unread}
                                onClick={() => set_unread_only(option.unread)}
                                className={`min-h-10 rounded-md px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-[#1d4ed8] ${unread_only === option.unread ? "bg-[#0b2238] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                                {option.label} ({option.count})
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <select aria-label="Filter by feature" value={category}
                            onChange={(event) => {
                                const selected = categories.find(({ key }) => key === event.currentTarget.value);
                                if (selected) set_category(selected.key);
                            }}
                            className="min-h-10 appearance-none rounded-md border border-slate-200 bg-slate-50 py-1 pl-3 pr-9 text-sm text-slate-700 focus-visible:outline-2 focus-visible:outline-[#1d4ed8]">
                            {categories.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
                        </select>
                        <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-600" />
                    </div>
                    <Button variant="secondary" className="sm:ml-auto" disabled={is_saving || !has_unread} onClick={() => void update_read()}>
                        <Check size={15} aria-hidden="true" /> Mark all as read
                    </Button>
                </div>
                <p role="status" className="sr-only">{visible.length} shown. {unread_rows.length} unread in the selected scope.</p>

                {groups.length ? (
                    <div className="space-y-4" aria-busy={is_saving}>
                        {groups.map(({ label, rows: group_rows }) => (
                            <section key={label} aria-label={label}>
                                <h2 className="mb-2 text-sm font-semibold text-[#0b2238]">{label}</h2>
                                <ul className="space-y-2">
                                    {group_rows.map((row) => (
                                        <NotificationItem key={row.id} notification={row} now={now} disabled={is_saving}
                                            on_read_change={(id, is_read) => void update_read(id, is_read)} />
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-1 py-2">
                        <h2 className="font-semibold text-[#0b2238]">{caught_up ? "All caught up" : rows.length ? "No matching notifications" : "No notifications yet"}</h2>
                        <p className="text-sm text-slate-600">
                            {caught_up ? "All notifications are marked as read." : rows.length
                                ? "No notifications match the selected filters." : "There are no alerts for your assigned features."}
                        </p>
                    </div>
                )}
            </Card>
        </section>
    );
}
