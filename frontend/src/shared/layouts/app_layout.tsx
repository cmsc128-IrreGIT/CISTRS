import { Outlet, useMatch } from "react-router";
import AppHeader from "../components/header/app_header";
import MobileNavbar from "../components/navigation/mobile_navbar";
import Sidebar from "../components/navigation/sidebar";

export default function AppLayout() {
    const is_dashboard = Boolean(useMatch("/dashboard"));
    return (
        <div
            className={`flex min-h-dvh ${is_dashboard ? "bg-linear-to-br from-[#f3f6f9] via-[#f6f8fa] to-[#edf0f3]" : "bg-[#f4f6f9]"}`}
        >
            <a
                href="#main_content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:p-3"
            >
                Skip to content
            </a>

            <Sidebar />

            <div className="min-w-0 flex-1">
                <AppHeader />

                <main
                    id="main_content"
                    tabIndex={-1}
                    className={`mx-auto w-full max-w-[1440px] p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-6 md:pb-5 ${is_dashboard ? "md:pt-8 xl:px-9" : "md:pt-5 xl:px-8"}`}
                >
                    <Outlet />
                </main>
            </div>

            <MobileNavbar />
        </div>
    );
}
