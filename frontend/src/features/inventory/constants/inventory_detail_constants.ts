import { ClipboardList, FileClock, History, Package } from "lucide-react";

export const INVENTORY_DETAIL_TAB_PARAM = "tab";

export const INVENTORY_DETAIL_TABS = [
    {
        id: "information",
        label: "Item information",
        icon: Package,
        read_only: true,
    },
    {
        id: "stock-history",
        label: "Stock history",
        icon: History,
        read_only: false,
    },
    {
        id: "record-changes",
        label: "Record changes",
        icon: FileClock,
        read_only: false,
    },
    {
        id: "history-and-usage",
        label: "History & usage",
        icon: ClipboardList,
        read_only: true,
    },
] as const;
