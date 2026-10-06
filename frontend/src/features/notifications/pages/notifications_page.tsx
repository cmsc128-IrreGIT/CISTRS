import ComingSoon from "../../../shared/components/feedback/coming_soon";
import Card from "../../../shared/components/ui/card";

export default function NotificationsPage() {
    return (
        <section aria-labelledby="page_title" className="space-y-6">
            <h1 id="page_title" className="text-2xl font-bold text-slate-900">
                Notifications and Alerts
            </h1>

            <Card>
                <ComingSoon feature_name="Notifications and Alerts" />
            </Card>
        </section>
    );
}
