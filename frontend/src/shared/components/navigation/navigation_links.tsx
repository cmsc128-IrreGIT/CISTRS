import { NavLink } from "react-router";
import { navigation_items } from "./navigation_items";

type NavigationLinksProps = {
    collapsed?: boolean;
    on_navigate?: () => void;
};

export default function NavigationLinks({
    collapsed = false,
    on_navigate,
}: NavigationLinksProps) {
    return (
        <>
            {navigation_items.map(({ to, label, icon: Icon }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={to === "/personnel"}
                    onClick={on_navigate}
                    title={collapsed ? label : undefined}
                    aria-label={collapsed ? label : undefined}
                    className={({ isActive }) =>
                        `flex min-h-11 items-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                            collapsed ? "justify-center px-2" : "gap-3 px-3"
                        } ${
                            isActive
                                ? "bg-red-600 text-white"
                                : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`
                    }
                >
                    <Icon size={20} aria-hidden="true" className="shrink-0" />
                    {!collapsed && <span>{label}</span>}
                </NavLink>
            ))}
        </>
    );
}
