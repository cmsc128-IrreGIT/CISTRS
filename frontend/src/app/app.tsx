import AuthProvider from "../features/auth/components/auth_provider";
import { BrowserRouter } from "react-router";
import ToastProvider from "../shared/components/feedback/toast_provider";
import AppRoutes from "./app_routes";

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
            <ToastProvider />
        </BrowserRouter>
    );
}
