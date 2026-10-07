import { Outlet, useLocation } from "react-router";
import AppHeader from "../components/header/app_header";
import MobileNavbar from "../components/navigation/mobile_navbar";
import Sidebar from "../components/navigation/sidebar";
import PageTransition from "../components/transitions/page_transition";

export default function AppLayout() {
    const location = useLocation();

    return (
        <div className="flex min-h-dvh bg-slate-100">
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
                    className="p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:py-6"
                >
                    <PageTransition key={location.pathname}>
                        <Outlet />
                    </PageTransition>
                </main>
            </div>

            <MobileNavbar />
        </div>
    );
}
