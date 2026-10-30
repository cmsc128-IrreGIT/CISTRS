import MaintenanceDetailsPage from "../features/maintenance/pages/maintenance_details_page";
import HelpPage from "../shared/pages/help_page";
import { lazy, Suspense } from "react";
import ScreenLoading from "../shared/components/feedback/screen_loading";
import ForbiddenPage from "../shared/pages/forbidden_page";
import { Navigate, Route, Routes } from "react-router";
import RequireSession from "../features/auth/components/require_session";

import LoginPage from "../features/auth/pages/login_page";
import ProfilePage from "../features/account/pages/profile_page";
import SettingsPage from "../features/account/pages/settings_page";
import SignupPage from "../features/auth/pages/signup_page";
import ForgotPasswordPage from "../features/auth/pages/forgot_password_page";
import NotFoundPage from "../shared/pages/not_found_page";

import InventoryPage from "../features/inventory/pages/inventory_page";
import InventoryDetailsPage from "../features/inventory/pages/inventory_details_page";
import InventoryFormPage from "../features/inventory/pages/inventory_form_page";
import InventoryHistoryPage from "../features/inventory/pages/inventory_history_page";

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

import PersonnelPage from "../features/personnel/pages/personnel_page";
import PersonnelDetailsPage from "../features/personnel/pages/personnel_details_page";
import PersonnelFormPage from "../features/personnel/pages/personnel_form_page";
import AvailabilityPage from "../features/personnel/pages/availability_page";

import NotificationsPage from "../features/notifications/pages/notifications_page";

import UsersPage from "../features/user_management/pages/users_page";
import UserDetailsPage from "../features/user_management/pages/user_details_page";
import UserFormPage from "../features/user_management/pages/user_form_page";

const DashboardPage = lazy(
    () => import("../features/dashboard/pages/dashboard_page"),
);

const LogbookPage = lazy(
    () => import("../features/logbook/pages/logbook_page"),
);
const LogbookFormPage = lazy(
    () => import("../features/logbook/pages/logbook_form_page"),
);

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

                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/inventory/new" element={<InventoryFormPage />} />
                <Route
                    path="/inventory/history"
                    element={<InventoryHistoryPage />}
                />
                <Route
                    path="/inventory/:item_id"
                    element={<InventoryDetailsPage />}
                />
                <Route
                    path="/inventory/:item_id/edit"
                    element={<InventoryFormPage />}
                />

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
                            <MaintenanceFormPage />
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

                <Route
                    path="/logbook"
                    element={
                        <Suspense fallback={<ScreenLoading />}>
                            <LogbookPage />
                        </Suspense>
                    }
                />
                <Route
                    path="/logbook/new"
                    element={
                        <Suspense fallback={<ScreenLoading />}>
                            <LogbookFormPage />
                        </Suspense>
                    }
                />
                <Route
                    path="/logbook/:entry_id/edit"
                    element={
                        <Suspense fallback={<ScreenLoading />}>
                            <LogbookFormPage />
                        </Suspense>
                    }
                />

                <Route path="/personnel" element={<PersonnelPage />} />
                <Route path="/personnel/new" element={<PersonnelFormPage />} />
                <Route
                    path="/personnel/availability"
                    element={<AvailabilityPage />}
                />
                <Route
                    path="/personnel/:personnel_id"
                    element={<PersonnelDetailsPage />}
                />
                <Route
                    path="/personnel/:personnel_id/edit"
                    element={<PersonnelFormPage />}
                />

                <Route path="/notifications" element={<NotificationsPage />} />

                <Route path="/users" element={<UsersPage />} />
                <Route path="/users/new" element={<UserFormPage />} />
                <Route path="/users/:user_id" element={<UserDetailsPage />} />
                <Route path="/users/:user_id/edit" element={<UserFormPage />} />
            </Route>

            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}
