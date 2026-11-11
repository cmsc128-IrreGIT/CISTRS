import { Bell, PlaneTakeoff } from "lucide-react";
import FeatureHelp from "../feedback/feature_help";
import { Link, useMatch } from "react-router";
import { useAuth } from "../../../features/auth/hooks/auth_context";
import { workspace_label } from "../navigation/workspace";
import ProfileMenu from "./profile_menu";

export default function AppHeader() {
  const { user, logout } = useAuth();
  const dashboard = Boolean(useMatch("/dashboard"));
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      {dashboard && (
        <div className="flex min-w-0 items-center gap-2 md:pl-6">
          <span className="text-lg font-bold text-[#0b2238] sm:text-[1.375rem]">
            Dashboard
          </span>
          <FeatureHelp
            title="Dashboard"
            text="Review summaries and open the related records. Cards follow the features assigned to your position."
          />
        </div>
      )}
      <Link
        to="/dashboard"
        aria-label="CISTRS dashboard"
        className={`${dashboard ? "hidden" : "flex"} items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 md:hidden`}
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-[#0b2238] text-white">
          <PlaneTakeoff size={22} strokeWidth={1.8} aria-hidden="true" />
        </span>

        <span className="text-lg font-bold tracking-tight text-[#0b2238]">
          CISTRS
        </span>
      </Link>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <Link
          to="/notifications"
          aria-label="Open notifications"
          title="Notifications"
          className="flex size-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-[#eaf0ff] hover:text-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-[#1d4ed8]"
        >
          <Bell
            size={dashboard ? 18 : 21}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </Link>

        <div
          className={dashboard ? "" : "border-l border-slate-200 pl-2 sm:pl-3"}
        >
          <ProfileMenu
            display_name={user?.username ?? "Account"}
            role={workspace_label(user)}
            compact={dashboard}
            on_logout={logout}
          />
        </div>
      </div>
    </header>
  );
}
