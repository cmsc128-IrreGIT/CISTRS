import { useNavigate } from "react-router";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Card from "../../../shared/components/ui/card";
import DetailsList from "../../../shared/components/ui/details_list";
import NotificationPreferencesForm from "../components/notification_preferences_form";
import { default_notification_preferences } from "../config/notification_preferences";
// import type {
//     DeliveryChannel,
//     NotificationPreferences,
// } from "../config/notification_preferences";

// const preferences_by_account = new Map<string, NotificationPreferences>();

// function channel_summary(
//     preferences: NotificationPreferences,
//     channel: DeliveryChannel,
// ) {
//     const enabled = Object.values(preferences.alerts).filter(
//         (alert) => alert[channel],
//     ).length;
//     if (!enabled) {
//         if (channel === "email" && !preferences.email)
//             return "Off · work email not added";
//         if (channel === "sms" && !preferences.mobile)
//             return "Off · mobile number not added";
//         return "Off";
//     }
//     return (
//         <StatusBadge tone="success">
//             {enabled === Object.keys(preferences.alerts).length
//                 ? "Enabled"
//                 : "Enabled for some alerts"}
//         </StatusBadge>
//     );
// }

export default function NotificationPreferencesPage() {
    const navigate = useNavigate();
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
                    Preference changes are not available yet.
                </p>
                <div className="mb-5 rounded-lg bg-slate-100 p-4">
                    <DetailsList
                        entries={[
                            {
                                id: "in_app",
                                label: "In-app notification preferences",
                                value: "Unavailable",
                            },
                            {
                                id: "email",
                                label: "Email alerts",
                                value: "Unavailable",
                            },
                            {
                                id: "sms",
                                label: "SMS alerts",
                                value: "Unavailable",
                            },
                            {
                                id: "expiry",
                                label: "Expiry reminder",
                                value: "Unavailable",
                            },
                        ]}
                    />
                </div>
                <NotificationPreferencesForm
                    initial={default_notification_preferences}
                    unavailable
                    on_cancel={() => void navigate("/notifications")}
                />
            </Card>
        </section>
    );
}
