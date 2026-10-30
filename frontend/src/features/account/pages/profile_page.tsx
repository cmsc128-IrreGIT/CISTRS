import { useAuth } from "../../auth/hooks/auth_context";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
export default function ProfilePage() {
    const { user } = useAuth();
    if (!user) return null;
    return (
        <section className="mx-auto max-w-3xl space-y-5">
            <PageHeader
                title_id="page_title"
                title="My Profile"
                description="Your signed-in account and assigned access."
            />
            <Card title="Account Information">
                <dl className="grid gap-5 sm:grid-cols-2">
                    {[
                        { label: "Username", value: user.username },
                        { label: "Roles", value: user.roles.join(", ") },
                        { label: "Access", value: user.features.join(", ") },
                    ].map((item) => (
                        <div key={item.label}>
                            <dt className="text-sm text-slate-500">
                                {item.label}
                            </dt>
                            <dd className="mt-1 text-sm font-medium text-slate-900">
                                {item.value || "Not assigned"}
                            </dd>
                        </div>
                    ))}
                </dl>
                <p className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-600">
                    Contact your administrator to update your account
                    information.
                </p>
            </Card>
        </section>
    );
}
