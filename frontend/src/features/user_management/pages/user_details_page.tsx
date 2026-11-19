import { Link, Outlet, useParams } from "react-router";
import EmptyState from "../../../shared/components/feedback/empty_state";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Card from "../../../shared/components/ui/card";
import DetailsList from "../../../shared/components/ui/details_list";
import { button_styles } from "../../../shared/styles/button_styles";
import AccountStatus from "../components/account_status";
import useUserManagement from "../hooks/use_user_management";
import { account_name } from "../types/user_account";

export default function UserDetailsPage() {
    const workspace = useUserManagement();
    const { user_id } = useParams();
    const account = workspace.accounts.find(({ account_UUID }) => account_UUID === user_id);
    if (!account) return (
        <section className="space-y-4">
            <WorkspaceBreadcrumbs parents={[{ label: "User Accounts", to: "/users" }]} current="Account not found" />
            <Card><EmptyState title="Account not found" action={<Link to="/users" className={button_styles("secondary")}>Return to accounts</Link>} /></Card>
        </section>
    );

    const name = account_name(account);
    const status = account.account_status;
    const last_login = Date.parse(account.last_login_at ?? "");

    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <WorkspaceBreadcrumbs parents={[{ label: "User Accounts", to: "/users" }]} current={name} />
            <h1 id="page_title" className="text-2xl font-semibold text-[#0b2238]">Manage account</h1>
            <Card>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h2 className="mb-3 font-semibold text-[#0b2238]">Account details</h2>
                    <DetailsList entries={[
                        { id: "personnel", label: "Linked personnel", value: [name, account.employee.emp_number].filter(Boolean).join(" · ") },
                        { id: "username", label: "Username", value: account.username },
                        { id: "role", label: "System role", value: account.employee.position?.position_name || "Not recorded" },
                        { id: "status", label: "Account status", value: <AccountStatus status={status} /> },
                        { id: "last_login", label: "Last sign-in", value: Number.isFinite(last_login) ? new Date(last_login).toLocaleString() : "Not yet signed in" },
                    ]} />
                </div>
                <div className="mt-4 border-b border-slate-200 pb-4">
                    <h2 className="mb-1 font-semibold text-[#0b2238]">Permissions</h2>
                    <p className="mb-3 text-sm text-slate-600">Live permissions follow the linked employee’s position.</p>
                    <p className="text-sm text-slate-600">Account status and permissions are read-only here.</p>
                </div>
            </Card>
            <Outlet context={workspace} />
        </section>
    );
}
