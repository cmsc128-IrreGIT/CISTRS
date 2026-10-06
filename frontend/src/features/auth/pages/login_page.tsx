import ComingSoon from "../../../shared/components/feedback/coming_soon";
import Card from "../../../shared/components/ui/card";

export default function LoginPage() {
    return (
        <section
            aria-labelledby="page_title"
            className="min-h-dvh space-y-6 bg-slate-100 p-6"
        >
            <h1 id="page_title" className="text-2xl font-bold text-slate-900">
                Login
            </h1>

            <Card>
                <ComingSoon feature_name="Login" />
            </Card>
        </section>
    );
}
