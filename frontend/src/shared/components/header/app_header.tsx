import { Bell, PlaneTakeoff } from "lucide-react";
import FeatureHelp from "../feedback/feature_help";
import { Link, useLocation, useMatch } from "react-router";
import { useAuth } from "../../../features/auth/hooks/auth_context";
import { get_inventory_access, position_label } from "../navigation/workspace";
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
  const personnel = Boolean(useMatch("/personnel/*"));
  const availability = Boolean(useMatch("/personnel/availability"));
  const notifications = Boolean(useMatch("/notifications/*"));
  const notification_preferences = Boolean(useMatch("/notifications/preferences"));
  const user_accounts = Boolean(useMatch("/users/*"));
  const profile = Boolean(useMatch("/profile"));
  const help = Boolean(useMatch("/help"));
  const aligned_workspace = dashboard || inventory || aircraft || maintenance || logbook || personnel || user_accounts || profile || notifications || help;
  const workspace_header = aligned_workspace;
  const title = dashboard
    ? "Dashboard"
    : aircraft
      ? "Aircraft"
      : maintenance
        ? "Maintenance"
        : logbook
          ? logbook_report ? "Logbook report preview" : "Aircraft Logbook"
          : personnel
            ? availability ? "Personnel availability" : "Personnel"
            : user_accounts
              ? "User Accounts"
              : profile
                ? "My profile"
                : notifications
                  ? notification_preferences ? "Notification preferences" : "Notifications"
                  : help ? "Help & guides" : lookup ? "Stock availability" : "Inventory";
  const guide_id = ([
    [dashboard, "dashboard"], [aircraft, "aircraft"], [maintenance, "maintenance"],
    [logbook, "logbook"], [personnel, "personnel"], [user_accounts, "accounts"],
    [notifications, "notifications"], [inventory, "inventory"],
  ] as const).find(([matches]) => matches)?.[1];
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white">
      <div className={`flex h-full items-center justify-between gap-3 ${aligned_workspace ? WORKSPACE_CONTENT_WIDTH : "px-4 sm:px-6"}`}>
        {workspace_header && (
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 text-lg leading-tight font-bold text-[#0b2238] sm:text-[1.375rem]">
              {title}
            </span>
            {guide_id && !notification_preferences && !lookup && pathname !== "/inventory/changes" && (
              <FeatureHelp title={title} guide_id={guide_id} />
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
          {user?.features.includes("Notifications") && (
            <Link
              to="/notifications"
              aria-label="Open notifications"
              title="Notifications"
              className={`flex size-11 items-center justify-center rounded-xl transition-colors hover:bg-[#eaf0ff] hover:text-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-[#1d4ed8] ${notifications ? "bg-[#eaf0ff] text-[#1d4ed8]" : "text-slate-500"}`}
            >
              <Bell
                size={workspace_header ? 18 : 21}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </Link>
          )}

          <div
            className={
              workspace_header ? "" : "border-l border-slate-200 pl-2 sm:pl-3"
            }
          >
            <ProfileMenu
              display_name={user?.full_name?.trim() || user?.username || "Account"}
              role={position_label(user)}
              compact={workspace_header}
              on_logout={logout}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
