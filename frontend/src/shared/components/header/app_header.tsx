import { Bell, PlaneTakeoff } from "lucide-react";
import { Link } from "react-router";
import { account_preview } from "../../../features/account/data/account_preview";
import ProfileMenu from "./profile_menu";

export default function AppHeader() {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
            <Link
                to="/dashboard"
                aria-label="CISTRS dashboard"
                className="flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 md:hidden"
            >
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#0b2238] text-white">
                    <PlaneTakeoff
                        size={22}
                        strokeWidth={1.8}
                        aria-hidden="true"
                    />
                </span>

                <span className="text-lg font-bold tracking-tight text-[#0b2238]">
                    CISTRS
                </span>
            </Link>

            <p className="hidden text-sm font-medium text-slate-600 md:block">
                Shuttle Air Services, Inc.
            </p>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <Link
                    to="/notifications"
                    aria-label="Open notifications"
                    title="Notifications"
                    className="flex size-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-600"
                >
                    <Bell size={21} strokeWidth={1.8} aria-hidden="true" />
                </Link>

                <div className="border-l border-slate-200 pl-2 sm:pl-3">
                    <ProfileMenu
                        display_name={account_preview.display_name}
                        role={`${account_preview.role} · Preview`}
                        email={account_preview.email}
                    />
                </div>
            </div>
        </header>
    );
}