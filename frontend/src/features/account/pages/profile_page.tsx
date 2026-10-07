import { Link } from "react-router";
import Card from "../../../shared/components/ui/card";
import { account_preview } from "../data/account_preview";

export default function ProfilePage() {
    const account = account_preview;

    const details = [
        { label: "Full Name", value: account.display_name },
        { label: "Username", value: account.username },
        { label: "Email Address", value: account.email },
        { label: "Position", value: account.position },
        { label: "System Role", value: account.role },
    ];

    const initials = account.display_name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();

    return (
        <section
            aria-labelledby="page_title"
            className="mx-auto max-w-3xl space-y-6"
        >
            <div>
                <h1
                    id="page_title"
                    className="text-2xl font-bold text-slate-900"
                >
                    My Profile
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                    Your account identity and assigned access.
                </p>
            </div>

            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Preview only. These are fictional account details.
            </p>

            <Card>
                <div className="flex items-center gap-4">
                    <div
                        aria-hidden="true"
                        className="flex size-16 shrink-0 items-center justify-center rounded-full bg-red-50 text-xl font-bold text-red-700"
                    >
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <h2 className="break-words text-lg font-semibold text-slate-900">
                            {account.display_name}
                        </h2>
                        <p className="text-sm text-slate-600">
                            {account.position}
                        </p>
                        <span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            {account.role}
                        </span>
                    </div>
                </div>
            </Card>

            <Card title="Account Information">
                <dl className="grid gap-5 sm:grid-cols-2">
                    {details.map(({ label, value }) => (
                        <div key={label}>
                            <dt className="text-sm text-slate-500">{label}</dt>
                            <dd className="mt-1 break-words font-medium text-slate-900">
                                {value}
                            </dd>
                        </div>
                    ))}
                </dl>

                <p className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500">
                    Account editing is not connected yet. Roles and permissions
                    are managed by an administrator.
                </p>
            </Card>

            <Link
                to="/settings"
                className="inline-flex min-h-11 items-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
            >
                Account Settings
            </Link>
        </section>
    );
}
