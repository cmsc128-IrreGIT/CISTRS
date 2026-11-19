const TOKEN_KEY = "cistrs.session";
export const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
export class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}
export class ApiConnectionError extends Error {}

export function get_token() {
    return sessionStorage.getItem(TOKEN_KEY);
}
export function set_token(token: string | null) {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
}
export async function api_fetch(
    input: RequestInfo | URL,
    init: RequestInit = {},
) {
    const token = get_token();
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    let response: Response;
    try {
        response = await fetch(input, { ...init, headers });
    } catch (error) {
        if (init.signal?.aborted) throw error;
        throw new ApiConnectionError(
            "Cannot reach the server. Check that the backend is running and try again.",
            { cause: error },
        );
    }
    if (response.status === 401 && token && get_token() === token) {
        set_token(null);
        window.dispatchEvent(new Event("cistrs:session-expired"));
    }
    return response;
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await api_fetch(`${API_BASE_URL}${path}`, init);
    if (!response.ok) {
        let message =
            response.status === 403
                ? "You do not have access to these records."
                : "The request could not be completed.";
        try {
            const body = await response.json();
            if (typeof body.message === "string") message = body.message;
        } catch {
            /* Use fallback for non-JSON errors. */
        }
        throw new ApiError(response.status, message);
    }
    return response.json() as Promise<T>;
}

// Notification API types matching backend response
export interface NotificationItem {
    recipient_UUID: string;
    notification_UUID: string;
    title: string;
    message: string;
    severity: "Info" | "Warning" | "Critical";
    category: "Personnel" | "Inventory" | "Aircraft" | "Maintenance" | "System";
    event_code: string;
    created_at: string;
    read_at: string | null;
    is_read: boolean;
}

export interface NotificationsResponse {
    items: NotificationItem[];
    total: number;
    unread_count: number;
    page: number;
    limit: number;
}

export interface UnreadCountResponse {
    unread_count: number;
}

export interface MarkReadResponse {
    recipient_UUID: string;
    is_read: boolean;
}

export interface MarkAllReadResponse {
    updated: number;
}

export const notificationsApi = {
    list: (params?: {
        category?: string;
        unread?: boolean;
        page?: number;
        limit?: number;
    }): Promise<NotificationsResponse> => {
        const searchParams = new URLSearchParams();
        if (params?.category) searchParams.set("category", params.category);
        if (params?.unread !== undefined) searchParams.set("unread", params.unread ? "true" : "false");
        if (params?.page) searchParams.set("page", String(params.page));
        if (params?.limit) searchParams.set("limit", String(params.limit));
        const query = searchParams.toString();
        return api<NotificationsResponse>(`/notifications${query ? `?${query}` : ""}`);
    },

    unreadCount: (): Promise<UnreadCountResponse> =>
        api<UnreadCountResponse>("/notifications/unread-count"),

    markRead: (recipientUUID: string): Promise<MarkReadResponse> =>
        api<MarkReadResponse>(`/notifications/${recipientUUID}/read`, { method: "PATCH" }),

    markAllRead: (category?: string): Promise<MarkAllReadResponse> =>
        api<MarkAllReadResponse>("/notifications/read-all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(category ? { category } : {}),
        }),
};
