import { BrowserRouter } from "react-router";
import ToastProvider from "../shared/components/feedback/toast_provider";
import AppRoutes from "./app_routes";

export default function App() {
    return (
        <BrowserRouter>
            <AppRoutes />
            <ToastProvider />
        </BrowserRouter>
    );
}
