import { Bell, PlaneTakeoff } from "lucide-react";
import FeatureHelp from "../feedback/feature_help";
import { Link, useLocation, useMatch } from "react-router";
import { useAuth } from "../../../features/auth/hooks/auth_context";
import { get_inventory_access, workspace_label } from "../navigation/workspace";
import ProfileMenu from "./profile_menu";
import { WORKSPACE_CONTENT_WIDTH } from "../../styles/layout_styles";

export default function AppHeader() {
  const { user, logout } = useAuth();
  const dashboard = Boolean(useMatch("/dashboard"));
  const pathname = useLocation().pathname.replace(/\/$/, "");
  const inventory = Boolean(useMatch("/inventory/*"));
  const lookup = inventory && get_inventory_access(user) === "read";
  const aircraft = Boolean(useMatch("/aircraft/*"));
  const maintenance = Boolean(useMatch("/maintenance/*"));
  const logbook = Boolean(useMatch("/logbook/*"));
  const logbook_report = Boolean(useMatch("/logbook/report"));
  const aligned_workspace = inventory || aircraft || maintenance || logbook;
  const workspace_header = dashboard || aligned_workspace;
  const title = dashboard
    ? "Dashboard"
    : aircraft
      ? "Aircraft"
      : maintenance
        ? "Maintenance"
        : logbook
          ? logbook_report ? "Logbook report preview" : "Aircraft Logbook"
          : lookup
            ? "Stock availability"
            : "Inventory";
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white">
      <div className={`flex h-full items-center justify-between gap-3 ${aligned_workspace ? WORKSPACE_CONTENT_WIDTH : "px-4 sm:px-6"}`}>
        {workspace_header && (
          <div className={`flex min-w-0 items-center gap-2 ${aligned_workspace ? "" : "md:pl-6"}`}>
            <span className="text-lg font-bold text-[#0b2238] sm:text-[1.375rem]">
              {title}
            </span>
            {!lookup && pathname !== "/inventory/changes" && (
              <FeatureHelp
                title={title}
                text={
                  dashboard
                    ? "Review summaries and open the related records. Cards follow the features assigned to your position."
                    : aircraft
                      ? "Browse fleet records and review aircraft status and related maintenance. Aircraft type, hours, and status are preview values."
                      : maintenance
                        ? "Browse recorded maintenance work and review linked stock issues."
                        : logbook
                          ? "Find logbook entries, review observed conditions, and open linked maintenance records."
                          : "Search for parts, filter by location or stock status, and use the tabs to review inventory records."
                }
              />
            )}
          </div>
        )}
        <Link
          to="/dashboard"
          aria-label="CISTRS dashboard"
          className={`${workspace_header ? "hidden" : "flex"} items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 md:hidden`}
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
              size={workspace_header ? 18 : 21}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </Link>

          <div
            className={
              workspace_header ? "" : "border-l border-slate-200 pl-2 sm:pl-3"
            }
          >
            <ProfileMenu
              display_name={user?.username ?? "Account"}
              role={workspace_label(user)}
              compact={workspace_header}
              on_logout={logout}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
