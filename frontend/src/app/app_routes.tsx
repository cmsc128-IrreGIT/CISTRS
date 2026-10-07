import { lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes } from "react-router";
import AppLayout from "../shared/layouts/app_layout";

import LoginPage from "../features/auth/pages/login_page";
import ProfilePage from "../features/account/pages/profile_page";
import SettingsPage from "../features/account/pages/settings_page";

import InventoryPage from "../features/inventory/pages/inventory_page";
import InventoryDetailsPage from "../features/inventory/pages/inventory_details_page";
import InventoryFormPage from "../features/inventory/pages/inventory_form_page";
import InventoryHistoryPage from "../features/inventory/pages/inventory_history_page";

import AircraftPage from "../features/aircraft/pages/aircraft_page";
import AircraftDetailsPage from "../features/aircraft/pages/aircraft_details_page";
import AircraftStatusPage from "../features/aircraft/pages/aircraft_status_page";

import MaintenancePage from "../features/maintenance/pages/maintenance_page";
import MaintenanceFormPage from "../features/maintenance/pages/maintenance_form_page";

import LogbookPage from "../features/logbook/pages/logbook_page";
import LogbookFormPage from "../features/logbook/pages/logbook_form_page";

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

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />

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

                <Route path="/logbook" element={<LogbookPage />} />
                <Route path="/logbook/new" element={<LogbookFormPage />} />
                <Route
                    path="/logbook/:entry_id/edit"
                    element={<LogbookFormPage />}
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

                <Route
                    path="*"
                    element={
                        <section>
                            <h1 className="text-2xl font-bold">
                                Page not found
                            </h1>
                            <Link
                                to="/dashboard"
                                className="mt-4 inline-block rounded-sm text-slate-600 underline underline-offset-4 hover:text-[#0b2238] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
                            >
                                Return to dashboard
                            </Link>
                        </section>
                    }
                />
            </Route>
        </Routes>
    );
}
