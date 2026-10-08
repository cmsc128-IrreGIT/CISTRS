import type { NotificationCategory } from "../types/notification_types";
export const notification_categories: {
    key: NotificationCategory | "all";
    label: string;
}[] = [
    { key: "all", label: "All" },
    { key: "inventory", label: "Inventory" },
    { key: "maintenance", label: "Maintenance" },
    { key: "aircraft", label: "Aircraft" },
    { key: "system", label: "System" },
];
