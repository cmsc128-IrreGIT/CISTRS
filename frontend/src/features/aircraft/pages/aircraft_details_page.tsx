import ComingSoon from "../../../shared/components/feedback/coming_soon";
import Card from "../../../shared/components/ui/card";

export default function AircraftDetailsPage() {
    return (
        <section aria-labelledby="page_title" className="space-y-6">
            <h1 id="page_title" className="text-2xl font-bold text-slate-900">
                Aircraft Details
            </h1>

            <Card>
                <ComingSoon feature_name="Aircraft Details" />
            </Card>
        </section>
    );
}
