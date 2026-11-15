import { Shield, UserMinus } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import ConfirmDialog from "../../../shared/components/feedback/confirm_dialog";
import EmptyState from "../../../shared/components/feedback/empty_state";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import DetailsList from "../../../shared/components/ui/details_list";
import { button_styles } from "../../../shared/styles/button_styles";
import AccountStatus from "../components/account_status";
import useUserManagement from "../hooks/use_user_management";
import { account_name } from "../types/user_account";

export default function UserDetailsPage() {
    const workspace = useUserManagement();
    const { user_id } = useParams();
    const navigate = useNavigate();
    const [confirming, set_confirming] = useState(false);
    const account = workspace.accounts.find(({ account_UUID }) => account_UUID === user_id);
    if (!account) return (
        <section className="space-y-4">
            <WorkspaceBreadcrumbs parents={[{ label: "User Accounts", to: "/users" }]} current="Account not found" />
            <Card><EmptyState title="Account not found" action={<Link to="/users" className={button_styles("secondary")}>Return to accounts</Link>} /></Card>
        </section>
    );

    const id = account.account_UUID;
    const name = account_name(account);
    const preview = workspace.previews?.get(id);
    const status = preview?.status ?? account.account_status;
    const self = workspace.owner === id;

    function deactivate() {
        if (self || status === "Inactive") return;
        workspace.save_preview(id, { status: "Inactive", duties: preview?.duties ?? [] });
        set_confirming(false);
        toast.success("Deactivation preview saved", { position: "bottom-right" });
        void navigate("/users");
    }

    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <WorkspaceBreadcrumbs parents={[{ label: "User Accounts", to: "/users" }]} current={name} />
            <h1 id="page_title" className="text-2xl font-semibold text-[#0b2238]">Manage account</h1>
            <Card>
                <div className="rounded-lg bg-slate-100 p-4">
                    <h2 className="mb-3 font-semibold text-[#0b2238]">Account details</h2>
                    <DetailsList entries={[
                        { id: "personnel", label: "Linked personnel", value: [name, account.employee.emp_number].filter(Boolean).join(" · ") },
                        { id: "username", label: "Username", value: account.username },
                        { id: "role", label: "System role", value: account.employee.position?.position_name || "Not recorded" },
                        { id: "status", label: "Account status", value: <AccountStatus status={status} preview={Boolean(preview)} /> },
                    ]} />
                </div>
                <div className="mt-4 border-b border-slate-200 pb-4">
                    <h2 className="mb-1 font-semibold text-[#0b2238]">Permissions</h2>
                    <p className="mb-3 text-sm text-slate-600">Live permissions follow the linked employee’s position.</p>
                    {!!preview?.duties.length && <p className="mb-3 text-sm text-slate-700">Preview duties: {preview.duties.join(", ")}</p>}
                    {self ? <p className="text-sm text-slate-600">Your own access is read-only here.</p> : (
                        <Link to={`/users/${encodeURIComponent(id)}/edit`} className={button_styles("secondary")}>
                            <Shield size={16} aria-hidden="true" /> Change permissions
                        </Link>
                    )}
                </div>
                {!self && <div className="pt-4">
                    <h2 className="mb-1 font-semibold text-[#0b2238]">Deactivate account</h2>
                    <p className="mb-3 text-sm text-slate-600">Preview an inactive account in this browser session.</p>
                    <Button variant="secondary" className="border-red-200! text-red-700!" disabled={status === "Inactive"} onClick={() => set_confirming(true)}>
                        <UserMinus size={16} aria-hidden="true" /> Deactivate account
                    </Button>
                </div>}
            </Card>
            <ConfirmDialog is_open={confirming} title={`Deactivate ${name}?`}
                message="The account will appear inactive in this browser session. Sign-in access will stay as set on the server."
                confirm_text="Deactivate account" on_confirm={deactivate} on_cancel={() => set_confirming(false)} />
            <Outlet context={workspace} />
        </section>
    );
}
