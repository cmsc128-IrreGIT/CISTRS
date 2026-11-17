export const alert_types = [
    { key: "stock", label: "Low stock & stock updates" },
    { key: "maintenance", label: "Maintenance due & aircraft updates" },
    { key: "expiry", label: "License & certificate expiry" },
    { key: "requests", label: "Requests & approval decisions" },
] as const;

export const delivery_channels = [
    { key: "in_app", label: "In-app" },
    { key: "email", label: "Email" },
    { key: "sms", label: "SMS" },
] as const;

export type AlertType = (typeof alert_types)[number]["key"];
export type DeliveryChannel = (typeof delivery_channels)[number]["key"];

export type NotificationPreferences = {
    email: string;
    mobile: string;
    alerts: Record<AlertType, Record<DeliveryChannel, boolean>>;
};

export const default_notification_preferences: NotificationPreferences = {
    email: "",
    mobile: "",
    alerts: {
        stock: { in_app: true, email: false, sms: false },
        maintenance: { in_app: true, email: false, sms: false },
        expiry: { in_app: true, email: false, sms: false },
        requests: { in_app: true, email: false, sms: false },
    },
};
