import ComingSoon from "../../../shared/components/feedback/coming_soon";
import Card from "../../../shared/components/ui/card";

export default function MaintenancePage() {
    return (
        <section aria-labelledby="page_title" className="space-y-6">
            <h1 id="page_title" className="text-2xl font-bold text-slate-900">
                Maintenance Records
            </h1>

            <Card>
                <ComingSoon feature_name="Maintenance Records" />
            </Card>
        </section>
    );
}
