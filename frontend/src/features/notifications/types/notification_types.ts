export type NotificationCategory =
    "inventory" | "maintenance" | "aircraft" | "system";

export type NotificationRecord = {
    id: string;
    title: string;
    message: string;
    category: NotificationCategory;
    to: string | null;
    created_at: string;
    read_at: string | null;
};

// A delivery attempt is separate from the recipient's in-app notification.
// Provider IDs and recipient contact details belong in the backend.
export type NotificationDelivery = {
    id: string;
    notification_id: string;
    channel: "email" | "sms";
    status: "pending" | "sent" | "delivered" | "failed";
    attempted_at: string | null;
    sent_at: string | null;
    delivered_at: string | null;
};

export type NotificationService = {
    list: () => Promise<NotificationRecord[]>;
    set_read: (id: string, is_read: boolean) => Promise<void>;
    mark_all_read: () => Promise<void>;
};
