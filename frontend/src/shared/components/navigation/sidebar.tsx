import { ChevronLeft, ChevronRight, LogIn, PlaneTakeoff } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import NavigationLinks from "./navigation_links";

export default function Sidebar() {
    const [collapsed, set_collapsed] = useState(false);

    return (
        <aside
            className={`sticky top-0 z-40 hidden h-dvh shrink-0 flex-col bg-[#0b2238] p-3 text-white transition-[width] duration-200 motion-reduce:transition-none md:flex ${
                collapsed ? "w-20" : "w-64"
            }`}
        >
            <Link
                to="/dashboard"
                aria-label="CISTRS dashboard"
                className={`flex h-14 shrink-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-white ${
                    collapsed ? "justify-center" : "gap-3 px-3"
                }`}
            >
                <PlaneTakeoff
                    size={26}
                    strokeWidth={1.8}
                    className="shrink-0 text-red-400"
                    aria-hidden="true"
                />

                {!collapsed && (
                    <span className="text-xl font-bold tracking-tight">
                        CISTRS
                    </span>
                )}
            </Link>

            <button
                type="button"
                onClick={() => set_collapsed((previous) => !previous)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                aria-controls="desktop_navigation"
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="absolute -right-4 top-20 z-50 flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
                {collapsed ? (
                    <ChevronRight size={16} aria-hidden="true" />
                ) : (
                    <ChevronLeft size={16} aria-hidden="true" />
                )}
            </button>

            <nav
                id="desktop_navigation"
                aria-label="Main navigation"
                className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
            >
                <NavigationLinks collapsed={collapsed} />
            </nav>

            <Link
                to="/login"
                title="Login preview"
                aria-label="Login preview"
                className={`mt-4 flex min-h-11 shrink-0 items-center rounded-lg text-sm text-slate-300 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white ${
                    collapsed ? "justify-center" : "gap-3 px-3"
                }`}
            >
                <LogIn size={20} aria-hidden="true" />
                {!collapsed && <span>Login preview</span>}
            </Link>
        </aside>
    );
}