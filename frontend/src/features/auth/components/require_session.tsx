import { Navigate, useLocation } from "react-router";
import { useAuth } from "../hooks/auth_context";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import AppLayout from "../../../shared/layouts/app_layout";
export default function RequireSession() {
    const { user, loading, error, retry } = useAuth();
    const location = useLocation();
    if (loading) return <ScreenLoading label="Opening your workspace…" />;
    if (error)
        return (
            <main className="mx-auto max-w-lg p-8">
                <p role="alert">{error}</p>
                <button
                    type="button"
                    onClick={retry}
                    className="mt-4 min-h-11 text-blue-700 underline"
                >
                    Retry connection
                </button>
            </main>
        );
    if (!user)
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location.pathname + location.search }}
            />
        );
    return <AppLayout />;
}
