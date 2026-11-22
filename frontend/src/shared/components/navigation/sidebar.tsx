import LogoutAction from "./logout_action";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../../features/auth/hooks/auth_context";
import NavigationLinks from "./navigation_links";
import { workspace_access_label } from "./workspace";
export default function Sidebar() {
  const { user } = useAuth();
  const [collapsed, set_collapsed] = useState(() => {
    try {
      return localStorage.getItem("cistrs.sidebar.collapsed") === "true";
    } catch {
      return false;
    }
  });
  function toggle() {
    set_collapsed((old) => {
      const next = !old;
      try {
        localStorage.setItem("cistrs.sidebar.collapsed", String(next));
      } catch {
        /* Storage can be disabled. */
      }
      return next;
    });
  }
  return (
    <aside
      aria-label="Sidebar"
      className={`sticky top-0 z-40 hidden h-dvh shrink-0 flex-col bg-[#0b2238] p-3 text-white transition-[width] duration-200 motion-reduce:transition-none md:flex ${collapsed ? "w-[72px]" : "w-[224px]"}`}
    >
      <div className="flex h-14 shrink-0 items-center justify-between">
        {!collapsed && (
          <Link
            to="/dashboard"
            aria-label="CISTRS dashboard"
            className="rounded px-2 text-xl font-bold focus-visible:outline-2"
          >
            CISTRS
          </Link>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-controls="desktop_navigation"
          className={`flex size-10 items-center justify-center rounded-lg hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white ${collapsed ? "mx-auto" : ""}`}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      {!collapsed && (
        <div className="mb-3 border-b border-white/15 px-2 pb-4 pt-2">
          <p className="text-[10px] tracking-widest text-slate-400">
            WORKSPACE
          </p>
          <p className="mt-1 text-xs font-medium">
            {workspace_access_label(user)}
          </p>
        </div>
      )}
      <nav
        id="desktop_navigation"
        aria-label="Main navigation"
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
      >
        <NavigationLinks collapsed={collapsed} grouped />
      </nav>
      <nav aria-label="Help navigation" className="mt-3">
        <NavigationLinks collapsed={collapsed} support />
      </nav>
      <LogoutAction collapsed={collapsed} />
    </aside>
  );
}
