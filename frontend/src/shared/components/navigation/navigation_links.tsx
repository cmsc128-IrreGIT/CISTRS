import { Fragment } from "react";
import { NavLink } from "react-router";
import { navigation_items } from "./navigation_items";

type NavigationLinksProps = {
    collapsed?: boolean;
    grouped?: boolean;
    on_navigate?: () => void;
};

export default function NavigationLinks({
    collapsed = false,
    grouped = false,
    on_navigate,
}: NavigationLinksProps) {
    return (
        <>
            {navigation_items.map(({ to, label, icon: Icon }) => (
                <Fragment key={to}>
                    {grouped && ["/personnel", "/users"].includes(to) && (
                        <div
                            aria-hidden="true"
                            className={`my-2 h-px shrink-0 bg-white/10 ${collapsed ? "mx-auto w-7" : "mx-3"}`}
                        />
                    )}
                    <NavLink
                        to={to}
                        end={to === "/personnel"}
                        onClick={on_navigate}
                        title={collapsed ? label : undefined}
                        aria-label={collapsed ? label : undefined}
                        className={({ isActive }) =>
                            `flex min-h-11 items-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                                collapsed
                                    ? "mx-auto size-11 shrink-0 justify-center"
                                    : "gap-3 px-3"
                            } ${
                                isActive
                                    ? "bg-[#1d4ed8] text-white"
                                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                            }`
                        }
                    >
                        <Icon
                            size={20}
                            aria-hidden="true"
                            className="shrink-0"
                        />
                        {!collapsed && <span>{label}</span>}
                    </NavLink>
                </Fragment>
            ))}
        </>
    );
}
