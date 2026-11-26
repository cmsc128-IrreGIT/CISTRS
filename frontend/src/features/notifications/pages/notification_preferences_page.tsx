import { useNavigate } from "react-router";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Card from "../../../shared/components/ui/card";
import DetailsList from "../../../shared/components/ui/details_list";
import NotificationPreferencesForm from "../components/notification_preferences_form";
import { default_notification_preferences } from "../config/notification_preferences";

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
