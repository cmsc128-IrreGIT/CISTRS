import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import AppLayout from "../shared/layouts/app_layout";

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

import AircraftPage from "../features/aircraft/pages/aircraft_page";
import AircraftDetailsPage from "../features/aircraft/pages/aircraft_details_page";
import AircraftStatusPage from "../features/aircraft/pages/aircraft_status_page";

import MaintenancePage from "../features/maintenance/pages/maintenance_page";
import MaintenanceFormPage from "../features/maintenance/pages/maintenance_form_page";

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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            <Route element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route
                    path="/dashboard"
                    element={
                        <Suspense
                            fallback={
                                <p
                                    role="status"
                                    className="py-6 text-sm text-slate-500"
                                >
                                    Loading dashboard…
                                </p>
                            }
                        >
                            <DashboardPage />
                        </Suspense>
                    }
                />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />

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

                <Route path="/aircraft" element={<AircraftPage />} />
                <Route
                    path="/aircraft/:aircraft_id"
                    element={<AircraftDetailsPage />}
                />
                <Route
                    path="/aircraft/:aircraft_id/status"
                    element={<AircraftStatusPage />}
                />

                <Route path="/maintenance" element={<MaintenancePage />} />
                <Route
                    path="/maintenance/new"
                    element={<MaintenanceFormPage />}
                />
                <Route
                    path="/maintenance/:maintenance_id/edit"
                    element={<MaintenanceFormPage />}
                />

                <Route
                    path="/logbook"
                    element={
                        <Suspense
                            fallback={<p role="status">Loading logbook…</p>}
                        >
                            <LogbookPage />
                        </Suspense>
                    }
                />
                <Route
                    path="/logbook/new"
                    element={
                        <Suspense
                            fallback={
                                <p role="status">Loading logbook form…</p>
                            }
                        >
                            <LogbookFormPage />
                        </Suspense>
                    }
                />
                <Route
                    path="/logbook/:entry_id/edit"
                    element={
                        <Suspense
                            fallback={
                                <p role="status">Loading logbook form…</p>
                            }
                        >
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

                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Routes>
    );
}
