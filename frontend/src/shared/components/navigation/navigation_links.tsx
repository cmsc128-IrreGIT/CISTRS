import { ClipboardCheck } from "lucide-react";
import { get_inventory_access, get_workspace } from "./workspace";
import { useAuth } from "../../../features/auth/hooks/auth_context";
import { Fragment } from "react";
import { NavLink, useLocation } from "react-router";
import { navigation_items } from "./navigation_items";

type NavigationLinksProps = {
  collapsed?: boolean;
  grouped?: boolean;
  on_navigate?: () => void;
  support?: boolean;
};

export default function NavigationLinks({
  collapsed = false,
  grouped = false,
  on_navigate,
  support = false,
}: NavigationLinksProps) {
  const pathname = useLocation().pathname;
  const { user } = useAuth();
  const workspace = get_workspace(user);
  const pilot = workspace === "pilot" || workspace === "pilot_mechanic";
  const features: Record<string, string> = {
    "/inventory": "Inventory",
    "/aircraft": "Aircraft",
    "/maintenance": "Maintenance",
    "/logbook": "Logbook",
    "/personnel": "Personnel",
    "/personnel/availability": "Availability",
    "/users": "User Accounts",
  };
  const items = navigation_items
    .filter(
      (item) =>
        (support ? item.to === "/help" : item.to !== "/help") &&
        (!features[item.to] || user?.features?.includes(features[item.to])),
    )
    .map((item) =>
      item.to === "/inventory" && get_inventory_access(user) === "read"
        ? { ...item, label: "Stock availability" }
        : item,
    );
  return (
    <>
      {items.map(({ to, label, icon: Icon }) => (
        <Fragment key={to}>
          {grouped && ["/personnel", "/users"].includes(to) && (
            <div
              aria-hidden="true"
              className={`my-2 h-px shrink-0 bg-white/10 ${collapsed ? "mx-auto w-7" : "mx-3"}`}
            />
          )}
          <NavLink
            to={to}
            end={to === "/personnel/availability"}
            aria-current={
              to === "/personnel" &&
              pathname.startsWith("/personnel/availability")
                ? false
                : "page"
            }
            onClick={on_navigate}
            title={collapsed ? label : undefined}
            aria-label={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex min-h-11 items-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                collapsed
                  ? "mx-auto size-11 shrink-0 justify-center"
                  : "gap-3 px-3"
              } ${
                isActive &&
                !(
                  to === "/personnel" &&
                  pathname.startsWith("/personnel/availability")
                )
                  ? "bg-[#1d4ed8] text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <Icon size={20} aria-hidden="true" className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
          {to === "/logbook" && pilot && (
            <span
              aria-disabled="true"
              title="Flight Checklist is unavailable"
              className={`flex min-h-11 items-center rounded-lg text-sm text-slate-400 ${collapsed ? "mx-auto size-11 justify-center" : "gap-3 px-3"}`}
            >
              <ClipboardCheck size={20} aria-hidden="true" />
              <span className={collapsed ? "sr-only" : undefined}>
                Flight Checklist
              </span>
            </span>
          )}
        </Fragment>
      ))}
    </>
  );
}
