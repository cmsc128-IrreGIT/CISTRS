import { Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import DetailsList from "../../../shared/components/ui/details_list";
import StatusBadge from "../../../shared/components/ui/status_badge";
import { useAuth } from "../../auth/hooks/auth_context";
import NotificationPreferencesForm from "../components/notification_preferences_form";
import { default_notification_preferences } from "../config/notification_preferences";
import type {
    DeliveryChannel,
    NotificationPreferences,
} from "../config/notification_preferences";

const preferences_by_account = new Map<string, NotificationPreferences>();

function channel_summary(
    preferences: NotificationPreferences,
    channel: DeliveryChannel,
) {
    const enabled = Object.values(preferences.alerts).filter(
        (alert) => alert[channel],
    ).length;
    if (!enabled) {
        if (channel === "email" && !preferences.email)
            return "Off · work email not added";
        if (channel === "sms" && !preferences.mobile)
            return "Off · mobile number not added";
        return "Off";
    }
    return (
        <StatusBadge tone="success">
            {enabled === Object.keys(preferences.alerts).length
                ? "Enabled"
                : "Enabled for some alerts"}
        </StatusBadge>
    );
}

export default function NotificationPreferencesPage() {
    const { user } = useAuth();
    return (
        user && (
            <Preferences
                key={user.account_UUID}
                account_id={user.account_UUID}
            />
        )
    );
}

function Preferences({ account_id }: { account_id: string }) {
    const [saved, set_saved] = useState(() =>
        preferences_by_account.get(account_id),
    );
    const [editing, set_editing] = useState(false);

    function save(preferences: NotificationPreferences) {
        preferences_by_account.set(account_id, preferences);
        set_saved(preferences);
        set_editing(false);
        toast.success("Notification preferences updated", {
            position: "bottom-right",
        });
    }

    return (
        <section className="space-y-4" aria-labelledby="page_title">
            <WorkspaceBreadcrumbs
                parents={[{ label: "Notifications", to: "/notifications" }]}
                current="Notification preferences"
            />
            <h1 id="page_title" className="sr-only">
                Notification preferences
            </h1>
            <Card>
                <p className="mb-4 text-sm text-slate-600">
                    Preferences are kept for this browser session. Email and SMS
                    delivery are unavailable.
                </p>
                {editing || !saved ? (
                    <NotificationPreferencesForm
                        initial={saved ?? default_notification_preferences}
                        on_save={save}
                        on_cancel={saved ? () => set_editing(false) : undefined}
                    />
                ) : (
                    <div className="rounded-lg bg-slate-100 p-4">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="font-semibold text-[#0b2238]">
                                Current preferences
                            </h2>
                            <Button
                                variant="secondary"
                                onClick={() => set_editing(true)}
                            >
                                <Pencil size={16} aria-hidden="true" /> Edit
                                preferences
                            </Button>
                        </div>
                        <DetailsList
                            entries={[
                                {
                                    id: "in_app",
                                    label: "In-app notifications",
                                    value: channel_summary(saved, "in_app"),
                                },
                                {
                                    id: "email",
                                    label: "Email alerts",
                                    value: channel_summary(saved, "email"),
                                },
                                {
                                    id: "sms",
                                    label: "SMS alerts",
                                    value: channel_summary(saved, "sms"),
                                },
                                {
                                    id: "expiry",
                                    label: "Expiry reminder",
                                    value: Object.values(
                                        saved.alerts.expiry,
                                    ).some(Boolean)
                                        ? "30 days before expiry"
                                        : "Off",
                                },
                            ]}
                        />
                    </div>
                )}
            </Card>
        </section>
    );
}
