import {
    Archive,
    ClipboardCheck,
    ClipboardList,
    FileClock,
    History,
    Package,
} from "lucide-react";

export const INVENTORY_REQUESTS_PATH = "/inventory/requests";
export const INVENTORY_CORRECTIONS_PATH = "/inventory/corrections";

export const INVENTORY_TABS = [
    { label: "Parts & Supplies", to: "/inventory", icon: Package },
    { label: "Stock History", to: "/inventory/history", icon: History },
    {
        label: "Restock Requests",
        to: INVENTORY_REQUESTS_PATH,
        icon: ClipboardList,
    },
    {
        label: "Stock Corrections",
        to: INVENTORY_CORRECTIONS_PATH,
        icon: ClipboardCheck,
    },
    {
        label: "Decommissioned Parts",
        to: "/inventory/decommissioned",
        icon: Archive,
    },
    { label: "Change History", to: "/inventory/changes", icon: FileClock },
] as const;

export const STOCK_STATUS_LABELS = {
    in_stock: "In stock",
    low_stock: "Low stock",
    out_of_stock: "Out of stock",
} as const;

export const STOCK_FILTER_LABELS = {
    ...STOCK_STATUS_LABELS,
    alerts: "Stock alerts",
} as const;

export const STOCK_FILTER_PARAM = "stock";
export const DECOMMISSIONED_PAGE_SIZE = 10;

export const DECOMMISSIONED_STORAGE_KEY = "decommissioned_inventory_ids";
export const DECOMMISSIONED_CHANGE_EVENT = "decommissioned_inventory_changed";

export const INVENTORY_DATE_OPTIONS = {
    day: "numeric",
    month: "short",
    year: "numeric",
} as const;

export const INVENTORY_PRIMARY_ACTION = "bg-[#0b2238]! hover:bg-[#193951]!";

export const STOCK_STATUS_STYLES: Record<
    keyof typeof STOCK_STATUS_LABELS,
    string
> = {
    in_stock: "bg-[#d4efdf] text-[#087443]",
    low_stock: "bg-amber-100 text-amber-900",
    out_of_stock: "bg-red-100 text-red-800",
};

export const INVENTORY_FILTER_SELECT =
    "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-normal text-slate-700 focus-visible:outline-2 focus-visible:outline-[#1d4ed8]";

export { workspace_tab_style as inventory_tab_style } from "../../../shared/styles/tab_styles";
