import MaintenanceDetailsPage from "../features/maintenance/pages/maintenance_details_page";
import HelpPage from "../shared/pages/help_page";
import { lazy, Suspense, type ReactNode } from "react";
import ScreenLoading from "../shared/components/feedback/screen_loading";
import ForbiddenPage from "../shared/pages/forbidden_page";
import { Navigate, Outlet, Route, Routes } from "react-router";
import { useAuth } from "../features/auth/hooks/auth_context";
import { get_inventory_access } from "../shared/components/navigation/workspace";
import RequireSession from "../features/auth/components/require_session";

import LoginPage from "../features/auth/pages/login_page";
import ProfilePage from "../features/account/pages/profile_page";
import SettingsPage from "../features/account/pages/settings_page";
import SignupPage from "../features/auth/pages/signup_page";
import ForgotPasswordPage from "../features/auth/pages/forgot_password_page";
import NotFoundPage from "../shared/pages/not_found_page";

import {
    INVENTORY_CORRECTIONS_PATH,
    INVENTORY_REQUESTS_PATH,
} from "../features/inventory/constants/inventory_constants";

const InventoryPage = lazy(
    () => import("../features/inventory/pages/inventory_page"),
);
const InventoryDetailsPage = lazy(
    () => import("../features/inventory/pages/inventory_details_page"),
);
const InventoryFormPage = lazy(
    () => import("../features/inventory/pages/inventory_form_page"),
);
const InventoryUnavailablePage = lazy(
    () => import("../features/inventory/pages/inventory_unavailable_page"),
);
const DecommissionedPartsPage = lazy(
    () =>
        import("../features/inventory/pages/inventory_decommissioned_parts_page"),
);
const InventoryHistoryPage = lazy(
    () => import("../features/inventory/pages/inventory_history_page"),
);

const AircraftPage = lazy(
    () => import("../features/aircraft/pages/aircraft_page"),
);
const AircraftDetailsPage = lazy(
    () => import("../features/aircraft/pages/aircraft_details_page"),
);
const AircraftStatusPage = lazy(
    () => import("../features/aircraft/pages/aircraft_status_page"),
);

const MaintenancePage = lazy(
    () => import("../features/maintenance/pages/maintenance_page"),
);
const MaintenanceFormPage = lazy(
    () => import("../features/maintenance/pages/maintenance_form_page"),
);

import NotificationPreferencesPage from "../features/notifications/pages/notification_preferences_page";
import NotificationsPage from "../features/notifications/pages/notifications_page";

import UserAccountsWorkspace from "../features/user_management/pages/user_accounts_workspace";
import UsersPage from "../features/user_management/pages/users_page";
import UserDetailsPage from "../features/user_management/pages/user_details_page";
import UserFormPage from "../features/user_management/pages/user_form_page";

const PersonnelWorkspace = lazy(
    () => import("../features/personnel/pages/personnel_workspace"),
);
const PersonnelPage = lazy(
    () => import("../features/personnel/pages/personnel_page"),
);
const PersonnelDetailsPage = lazy(
    () => import("../features/personnel/pages/personnel_details_page"),
);
const PersonnelDocumentsPage = lazy(
    () => import("../features/personnel/pages/personnel_documents_page"),
);
const PersonnelFormPage = lazy(
    () => import("../features/personnel/pages/personnel_form_page"),
);
const AvailabilityPage = lazy(
    () => import("../features/personnel/pages/availability_page"),
);

const InventoryRequestsPage = lazy(
    () => import("../features/inventory/pages/inventory_requests_page"),
);

const DashboardPage = lazy(
    () => import("../features/dashboard/pages/dashboard_page"),
);

const LogbookPage = lazy(
    () => import("../features/logbook/pages/logbook_page"),
);
const LogbookDetailsPage = lazy(
    () => import("../features/logbook/pages/logbook_details_page"),
);
const LogbookReportPage = lazy(
    () => import("../features/logbook/pages/logbook_report_page"),
);
const LogbookFormPage = lazy(
    () => import("../features/logbook/pages/logbook_form_page"),
);

function InventoryAccess({
    children,
    manage = false,
}: {
    children: ReactNode;
    manage?: boolean;
}) {
    const { user } = useAuth();
    const access = get_inventory_access(user);
    if (access === "none") return <Navigate to="/403" replace />;
    if (manage && access === "read")
        return <Navigate to="/inventory" replace />;
    return children;
}

function FeatureAccess({ feature }: { feature: string }) {
    const { user } = useAuth();
    return user?.features.includes(feature) ? (
        <Outlet />
    ) : (
        <Navigate to="/403" replace />
    );
}

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            <Route element={<RequireSession />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route
                    path="/dashboard"
                    element={
                        <Suspense fallback={<ScreenLoading />}>
                            <DashboardPage />
                        </Suspense>
                    }
                />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/help" element={<HelpPage />} />

                <Route
                    path="/inventory"
                    element={
                        <InventoryAccess>
                            <InventoryPage />
                        </InventoryAccess>
                    }
                >
                    <Route
                        path="new"
                        element={
                            <InventoryAccess manage>
                                <InventoryFormPage />
                            </InventoryAccess>
                        }
                    />
                </Route>
                <Route
                    path="/inventory/decommissioned"
                    element={
                        <InventoryAccess manage>
                            <DecommissionedPartsPage />
                        </InventoryAccess>
                    }
                />
                <Route
                    path="/inventory/changes"
                    element={
                        <InventoryAccess manage>
                            <InventoryUnavailablePage title="Change History" />
                        </InventoryAccess>
                    }
                />
                <Route
                    path={INVENTORY_REQUESTS_PATH}
                    element={
                        <InventoryAccess manage>
                            <InventoryRequestsPage />
                        </InventoryAccess>
                    }
                />
                <Route
                    path={INVENTORY_CORRECTIONS_PATH}
                    element={
                        <InventoryAccess manage>
                            <InventoryRequestsPage
                                key="corrections"
                                correction
                            />
                        </InventoryAccess>
                    }
                />
                <Route
                    path="/inventory/history"
                    element={
                        <InventoryAccess manage>
                            <InventoryHistoryPage />
                        </InventoryAccess>
                    }
                />
                <Route
                    path="/inventory/:item_id"
                    element={
                        <InventoryAccess>
                            <InventoryDetailsPage />
                        </InventoryAccess>
                    }
                >
                    <Route
                        path="edit"
                        element={
                            <InventoryAccess manage>
                                <InventoryFormPage />
                            </InventoryAccess>
                        }
                    />
                </Route>

                <Route element={<FeatureAccess feature="Aircraft" />}>
                    <Route
                        path="/aircraft"
                        element={
                            <Suspense fallback={<ScreenLoading />}>
                                <AircraftPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="/aircraft/:aircraft_id"
                        element={
                            <Suspense fallback={<ScreenLoading />}>
                                <AircraftDetailsPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="/aircraft/:aircraft_id/status"
                        element={
                            <Suspense fallback={<ScreenLoading />}>
                                <AircraftStatusPage />
                            </Suspense>
                        }
                    />
                </Route>

                <Route element={<FeatureAccess feature="Maintenance" />}>
                    <Route
                        path="/maintenance"
                        element={
                            <Suspense fallback={<ScreenLoading />}>
                                <MaintenancePage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="/maintenance/:maintenance_id"
                        element={<MaintenanceDetailsPage />}
                    />
                    <Route
                        path="/maintenance/new"
                        element={
                            <Suspense fallback={<ScreenLoading />}>
                                <MaintenancePage create_on_load />
                            </Suspense>
                        }
                    />
                    <Route
                        path="/maintenance/:maintenance_id/edit"
                        element={
                            <Suspense fallback={<ScreenLoading />}>
                                <MaintenanceFormPage />
                            </Suspense>
                        }
                    />
                </Route>

                <Route element={<FeatureAccess feature="Logbook" />}>
                    <Route
                        path="/logbook"
                        element={
                            <Suspense fallback={<ScreenLoading />}>
                                <LogbookPage />
                            </Suspense>
                        }
                    >
                        <Route
                            path="new"
                            element={
                                <Suspense fallback={<ScreenLoading />}>
                                    <LogbookFormPage />
                                </Suspense>
                            }
                        />
                    </Route>
                    <Route
                        path="/logbook/report"
                        element={
                            <Suspense fallback={<ScreenLoading />}>
                                <LogbookReportPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="/logbook/:entry_id"
                        element={
                            <Suspense fallback={<ScreenLoading />}>
                                <LogbookDetailsPage />
                            </Suspense>
                        }
                    >
                        <Route
                            path="edit"
                            element={
                                <Suspense fallback={<ScreenLoading />}>
                                    <LogbookFormPage />
                                </Suspense>
                            }
                        />
                    </Route>
                </Route>

                <Route element={<PersonnelWorkspace />}>
                    <Route path="/personnel" element={<PersonnelPage />}>
                        <Route path="new" element={<PersonnelFormPage />} />
                    </Route>
                    <Route
                        path="/personnel/:personnel_id"
                        element={<PersonnelDetailsPage />}
                    >
                        <Route path="edit" element={<PersonnelFormPage />} />
                    </Route>
                    <Route
                        path="/personnel/:personnel_id/documents"
                        element={<PersonnelDocumentsPage />}
                    />
                </Route>
                <Route
                    path="/personnel/availability"
                    element={<AvailabilityPage />}
                />

                <Route path="/notifications" element={<NotificationsPage />} />
                <Route
                    path="/notifications/preferences"
                    element={<NotificationPreferencesPage />}
                />

                <Route element={<UserAccountsWorkspace />}>
                    <Route path="/users" element={<UsersPage />}>
                        <Route path="new" element={<UserFormPage />} />
                    </Route>
                    <Route path="/users/:user_id" element={<UserDetailsPage />}>
                        <Route path="edit" element={<UserFormPage />} />
                    </Route>
                </Route>
            </Route>

            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}
