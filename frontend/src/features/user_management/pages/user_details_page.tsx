import { Link, useParams } from "react-router";
import BackLink from "../../../shared/components/navigation/back_link";
import PreviewNotice from "../../../shared/components/feedback/preview_notice";
import EmptyState from "../../../shared/components/feedback/empty_state";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import DetailsList from "../../../shared/components/ui/details_list";
import StatusBadge from "../../../shared/components/ui/status_badge";
import { button_styles } from "../../../shared/styles/button_styles";
import useUserManagement from "../hooks/use_user_management";

export default function UserDetailsPage() {
    const { user_id } = useParams();
    const rows = useUserManagement();
    const user = rows.find((row) => row.id === user_id);
    if (!user)
        return (
            <Card>
                <EmptyState
                    title="User not found"
                    description="This preview record may have been cleared on refresh."
                    action={
                        <Link
                            to="/users"
                            className={button_styles("secondary")}
                        >
                            Return to users
                        </Link>
                    }
                />
            </Card>
        );
    const initials = user.display_name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
    return (
        <section aria-labelledby="page_title" className="space-y-5">
            <BackLink to="/users" label="Back to users" />
            <PageHeader title="User Account Details" title_id="page_title" />
            <PreviewNotice>
                Preview account · Role and status are recorded values, not
                enforced permissions.
            </PreviewNotice>
            <Card>
                <div className="mx-auto max-w-3xl">
                    <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 pb-6">
                        <span
                            aria-hidden="true"
                            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-red-50 text-xl font-bold text-red-700"
                        >
                            {initials}
                        </span>
                        <div className="min-w-0 flex-1">
                            <h2 className="break-words text-xl font-semibold text-slate-900">
                                {user.display_name}
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {user.role}
                            </p>
                        </div>
                        <StatusBadge
                            tone={
                                user.status === "Active" ? "success" : "neutral"
                            }
                        >
                            {user.status}
                        </StatusBadge>
                    </div>
                    <div className="py-6">
                        <DetailsList
                            entries={[
                                {
                                    id: "name",
                                    label: "Display Name",
                                    value: user.display_name,
                                },
                                {
                                    id: "email",
                                    label: "Email",
                                    value: user.email,
                                },
                                {
                                    id: "username",
                                    label: "Username",
                                    value: user.username,
                                },
                                { id: "role", label: "Role", value: user.role },
                                {
                                    id: "status",
                                    label: "Account Status",
                                    value: user.status,
                                },
                            ]}
                        />
                    </div>
                    <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
                        <Link
                            to="/users"
                            className={button_styles("secondary")}
                        >
                            Back to Users
                        </Link>
                        <Link
                            to={`/users/${user.id}/edit`}
                            className={button_styles()}
                        >
                            Edit Account
                        </Link>
                    </div>
                </div>
            </Card>
        </section>
    );
}
