import { Navigate, Outlet } from "react-router";
import { ApiError } from "../../../shared/api/client";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import { useAuth } from "../../auth/hooks/auth_context";
import { useUserAccounts } from "../hooks/use_user_management";

export default function UserAccountsWorkspace() {
    const { user } = useAuth();
    if (!user?.features.includes("User Accounts")) return <Navigate to="/403" replace />;
    return <AccountsOutlet key={user.account_UUID} owner={user.account_UUID} can_read_personnel={user.features.includes("Personnel")} />;
}

function AccountsOutlet({ owner, can_read_personnel }: { owner: string; can_read_personnel: boolean }) {
    const accounts = useUserAccounts(owner, can_read_personnel);
    if (accounts.error instanceof ApiError && accounts.error.status === 403) return <Navigate to="/403" replace />;
    if (accounts.error || accounts.loading) return (
        <section className="space-y-4">
            <WorkspaceBreadcrumbs current="User Accounts" />
            <Card>
                {accounts.error ? (
                    <>
                        <p role="alert" className="mb-3 text-sm text-red-700">{accounts.error.message}</p>
                        <Button variant="secondary" onClick={accounts.reload}>Retry</Button>
                    </>
                ) : <ScreenLoading label="Loading accounts…" />}
            </Card>
        </section>
    );
    return <Outlet context={accounts} />;
}
