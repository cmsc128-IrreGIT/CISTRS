import WorkspaceTabs from "../../../shared/components/navigation/workspace_tabs";
import { Link, useMatch } from "react-router";
import {
    INVENTORY_TABS,
    inventory_tab_style,
} from "../constants/inventory_constants";

export function InventoryBreadcrumbs({
    current,
    read_only = false,
}: {
    current?: string;
    read_only?: boolean;
}) {
    return (
        <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 text-sm text-[#0b2238]"
        >
            <Link className="text-link" to="/dashboard">
                Dashboard
            </Link>
            <span aria-hidden="true">›</span>
            {current ? (
                <>
                    <Link className="text-link" to="/inventory">
                        Inventory
                    </Link>
                    <span aria-hidden="true">›</span>
                    <span
                        aria-current="page"
                        className="break-words font-semibold [overflow-wrap:anywhere]"
                    >
                        {current}
                    </span>
                </>
            ) : (
                <span aria-current="page" className="font-semibold">
                    {read_only ? "Stock availability" : "Inventory"}
                </span>
            )}
        </nav>
    );
}

export function InventoryTabs() {
    const match = useMatch("/inventory/:section?");
    const current =
        match?.params.section === "new"
            ? "/inventory"
            : match?.pathnameBase.toLowerCase();
    return (
        <WorkspaceTabs label="Inventory sections">
            {INVENTORY_TABS.map(({ label, to, icon: Icon }) => {
                const active = current === to;
                return (
                    <Link
                        key={to}
                        to={to}
                        aria-current={active ? "page" : undefined}
                        className={inventory_tab_style(active)}
                    >
                        <Icon size={16} aria-hidden="true" />
                        {label}
                    </Link>
                );
            })}
        </WorkspaceTabs>
    );
}
