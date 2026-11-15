import { Outlet, useMatch } from "react-router";
import AppHeader from "../components/header/app_header";
import MobileNavbar from "../components/navigation/mobile_navbar";
import Sidebar from "../components/navigation/sidebar";
import { WORKSPACE_CONTENT_WIDTH } from "../styles/layout_styles";

export default function AppLayout() {
    const is_dashboard = Boolean(useMatch("/dashboard"));
    const is_inventory = Boolean(useMatch("/inventory/*"));
    const is_aircraft = Boolean(useMatch("/aircraft/*"));
    const is_maintenance = Boolean(useMatch("/maintenance/*"));
    const is_logbook = Boolean(useMatch("/logbook/*"));
    const print_report = Boolean(useMatch("/logbook/report"));
    const is_personnel = Boolean(useMatch("/personnel/*"));
    const aligned_workspace = is_inventory || is_aircraft || is_maintenance || is_logbook || is_personnel;
    const workspace_background = is_dashboard || aligned_workspace;
    const content_width = aligned_workspace
        ? WORKSPACE_CONTENT_WIDTH
        : `mx-auto w-full max-w-[1440px] px-4 md:px-6 ${is_dashboard ? "xl:px-9" : "xl:px-8"}`;
    const report_print_style = print_report
        ? "print:block print:min-h-0 print:bg-white print:bg-none print:[&>aside]:hidden print:[&>nav]:hidden print:[&>div>header]:hidden"
        : "";
    return (
        <div
            className={`flex min-h-dvh ${workspace_background ? "bg-linear-to-br from-[#f3f6f9] via-[#f6f8fa] to-[#edf0f3]" : "bg-[#f4f6f9]"} ${report_print_style}`}
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
                    className={`${content_width} pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-5 ${workspace_background ? "md:pt-8" : "md:pt-5"} ${print_report ? "print:max-w-none print:p-0" : ""}`}
                >
                    <Outlet />
                </main>
            </div>

            <MobileNavbar />
        </div>
    );
}
