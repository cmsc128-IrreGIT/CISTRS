import type { NotificationCategory } from "../types/notification_types";

export const notification_categories: { key: NotificationCategory | "all"; label: string }[] = [
    { key: "all", label: "All features" },
    { key: "inventory", label: "Inventory" },
    { key: "aircraft", label: "Aircraft" },
    { key: "maintenance", label: "Maintenance" },
    { key: "personnel", label: "Personnel" },
    { key: "system", label: "System" },
];
