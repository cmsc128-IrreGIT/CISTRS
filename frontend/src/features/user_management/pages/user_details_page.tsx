import ComingSoon from "../../../shared/components/feedback/coming_soon";
import Card from "../../../shared/components/ui/card";

export default function UserDetailsPage() {
    return (
        <section aria-labelledby="page_title" className="space-y-6">
            <h1 id="page_title" className="text-2xl font-bold text-slate-900">
                User Account Details
            </h1>

            <Card>
                <ComingSoon feature_name="User Account Details" />
            </Card>
        </section>
    );
}
