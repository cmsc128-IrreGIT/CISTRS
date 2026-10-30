import LogoutAction from "./logout_action";
import { ChevronLeft, ChevronRight, PlaneTakeoff } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import NavigationLinks from "./navigation_links";

export default function Sidebar() {
    const [collapsed, set_collapsed] = useState(false);

    return (
        <aside
            className={`sticky top-0 z-40 hidden h-dvh shrink-0 flex-col bg-[#0b2238] p-2 text-white transition-[width] duration-200 motion-reduce:transition-none md:flex ${
                collapsed ? "w-[72px]" : "w-[248px]"
            }`}
        >
            <div className="relative flex h-14 shrink-0 items-center">
                <Link
                    to="/dashboard"
                    aria-label="CISTRS dashboard"
                    className={`flex h-14 shrink-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-white ${
                        collapsed ? "w-full justify-center" : "gap-2 pl-3 pr-11"
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

                {!collapsed && (
                    <button
                        type="button"
                        onClick={() => set_collapsed((previous) => !previous)}
                        aria-label={
                            collapsed ? "Expand sidebar" : "Collapse sidebar"
                        }
                        aria-expanded={!collapsed}
                        aria-controls="desktop_navigation"
                        title={
                            collapsed ? "Expand sidebar" : "Collapse sidebar"
                        }
                        className="absolute right-0 top-1.5 z-50 flex size-11 items-center justify-center rounded-full text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        {collapsed ? (
                            <ChevronRight size={16} aria-hidden="true" />
                        ) : (
                            <ChevronLeft size={16} aria-hidden="true" />
                        )}
                    </button>
                )}
            </div>
            {collapsed && (
                <button
                    type="button"
                    onClick={() => set_collapsed(false)}
                    aria-label="Expand sidebar"
                    aria-expanded={false}
                    aria-controls="desktop_navigation"
                    title="Expand sidebar"
                    className="mx-auto flex h-9 w-11 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
                >
                    <ChevronRight size={16} aria-hidden="true" />
                </button>
            )}

            <nav
                id="desktop_navigation"
                aria-label="Main navigation"
                className="mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
            >
                <NavigationLinks collapsed={collapsed} grouped />
            </nav>

            <LogoutAction collapsed={collapsed} />
        </aside>
    );
}
