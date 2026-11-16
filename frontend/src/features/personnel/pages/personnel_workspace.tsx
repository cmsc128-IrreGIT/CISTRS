import { Navigate, Outlet } from "react-router";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import { get_workspace } from "../../../shared/components/navigation/workspace";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import { useAuth } from "../../auth/hooks/auth_context";
import { usePersonnelRecords } from "../hooks/use_personnel_directory";
import type { PersonnelDirectoryContext } from "../hooks/use_personnel_directory";

function DirectoryOutlet({ account_id, can_manage, full_access, can_view_availability }: {
    account_id: string; can_manage: boolean; full_access: boolean; can_view_availability: boolean;
}) {
    const directory = usePersonnelRecords(account_id, true, full_access);
    if (directory.denied) return <Navigate to="/403" replace />;

    if (directory.loading || directory.error) {
        return (
            <section className="space-y-4">
                <WorkspaceBreadcrumbs current="Personnel" />
                <Card>
                    {directory.error ? (
                        <>
                            <p role="alert" className="mb-3 text-sm text-red-700">{directory.error.message}</p>
                            <Button variant="secondary" onClick={directory.reload}>Retry</Button>
                        </>
                    ) : <ScreenLoading label="Loading personnel…" />}
                </Card>
            </section>
        );
    }

    const context: PersonnelDirectoryContext = { ...directory, can_manage, full_access, can_view_availability };
    return <Outlet context={context} />;
}

export default function PersonnelWorkspace() {
    const { user } = useAuth();
    if (!user) return <Navigate to="/403" replace />;
    const full_access = user.features.includes("Personnel");
    return <DirectoryOutlet key={user.account_UUID} account_id={user.account_UUID}
        full_access={full_access}
        can_view_availability={user.features.includes("Availability")}
        can_manage={full_access && get_workspace(user) === "administrator"} />;
}
