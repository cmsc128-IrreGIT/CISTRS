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

// Personnel Availability types
export interface AvailabilityRecord {
    availability_UUID: string;
    emp_UUID: string;
    date: string;
    status: "Available" | "Unavailable";
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface AvailabilityListResponse {
    items: AvailabilityRecord[];
    total: number;
    page: number;
    limit: number;
}

// Personnel Documents types
export interface PersonalDocument {
    document_UUID: string;
    emp_UUID: string;
    kind: "License" | "Training" | "Medical" | "Company ID" | "Other";
    name: string;
    reference: string | null;
    date_issued: string;
    expiry_date: string | null;
    renewal_date: string | null;
    file_path: string | null;
    remarks: string | null;
    created_at: string;
    updated_at: string;
}

export interface DocumentListResponse {
    items: PersonalDocument[];
    total: number;
    page: number;
    limit: number;
}

// License types
export interface EmployeeLicense {
    emp_license_UUID: string;
    emp_UUID: string;
    license_type_UUID: string;
    license_type_name: string;
    renewal_status_UUID: string | null;
    renewal_status_name: string | null;
    license_number: string;
    issuing_authority: string;
    date_issued: string;
    expiry_date: string | null;
    remarks: string | null;
    created_at: string;
    updated_at: string;
}

export interface LicenseListResponse {
    items: EmployeeLicense[];
    total: number;
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
        if (params?.unread !== undefined)
            searchParams.set("unread", params.unread ? "true" : "false");
        if (params?.page) searchParams.set("page", String(params.page));
        if (params?.limit) searchParams.set("limit", String(params.limit));
        const query = searchParams.toString();
        return api<NotificationsResponse>(
            `/notifications${query ? `?${query}` : ""}`,
        );
    },

    unreadCount: (): Promise<UnreadCountResponse> =>
        api<UnreadCountResponse>("/notifications/unread-count"),

    markRead: (recipientUUID: string): Promise<MarkReadResponse> =>
        api<MarkReadResponse>(`/notifications/${recipientUUID}/read`, {
            method: "PATCH",
        }),

    markAllRead: (category?: string): Promise<MarkAllReadResponse> =>
        api<MarkAllReadResponse>("/notifications/read-all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(category ? { category } : {}),
        }),
};

// Helper to fetch list responses with X-Total-Count header
async function fetchList<T>(
    path: string,
): Promise<{ items: T[]; total: number; page: number; limit: number }> {
    const response = await api_fetch(`${API_BASE_URL}${path}`);
    if (!response.ok) {
        throw new ApiError(response.status, "Failed to fetch list");
    }
    const items = (await response.json()) as T[];
    const total = Number(response.headers.get("X-Total-Count") ?? items.length);
    // Calculate page from offset/limit params (default page 1)
    const url = new URL(path, API_BASE_URL);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? items.length);
    const page = limit > 0 ? Math.floor(offset / limit) + 1 : 1;
    return { items, total, page, limit };
}

export const availabilityApi = {
    list: (params?: {
        emp_UUID?: string;
        from?: string;
        to?: string;
        limit?: number;
        offset?: number;
    }): Promise<AvailabilityListResponse> => {
        const searchParams = new URLSearchParams();
        if (params?.emp_UUID) searchParams.set("emp_UUID", params.emp_UUID);
        if (params?.from) searchParams.set("from", params.from);
        if (params?.to) searchParams.set("to", params.to);
        if (params?.limit) searchParams.set("limit", String(params.limit));
        if (params?.offset) searchParams.set("offset", String(params.offset));
        const query = searchParams.toString();
        return fetchList<AvailabilityRecord>(
            `/personnel/availability${query ? `?${query}` : ""}`,
        );
    },

    get: (availability_UUID: string): Promise<AvailabilityRecord> =>
        api<AvailabilityRecord>(`/personnel/availability/${availability_UUID}`),

    create: (data: {
        emp_UUID: string;
        date: string;
        status: "Available" | "Unavailable";
        notes?: string | null;
    }): Promise<AvailabilityRecord> =>
        api<AvailabilityRecord>("/personnel/availability", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    update: (
        availability_UUID: string,
        data: {
            status?: "Available" | "Unavailable";
            notes?: string | null;
        },
    ): Promise<AvailabilityRecord> =>
        api<AvailabilityRecord>(
            `/personnel/availability/${availability_UUID}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            },
        ),

    delete: (availability_UUID: string): Promise<{ deleted: boolean }> =>
        api<{ deleted: boolean }>(
            `/personnel/availability/${availability_UUID}`,
            { method: "DELETE" },
        ),
};

export const documentsApi = {
    list: (params?: {
        emp_UUID?: string;
        kind?: "License" | "Training" | "Medical" | "Company ID" | "Other";
        from?: string;
        to?: string;
        limit?: number;
        offset?: number;
    }): Promise<DocumentListResponse> => {
        const searchParams = new URLSearchParams();
        if (params?.emp_UUID) searchParams.set("emp_UUID", params.emp_UUID);
        if (params?.kind) searchParams.set("kind", params.kind);
        if (params?.from) searchParams.set("from", params.from);
        if (params?.to) searchParams.set("to", params.to);
        if (params?.limit) searchParams.set("limit", String(params.limit));
        if (params?.offset) searchParams.set("offset", String(params.offset));
        const query = searchParams.toString();
        return fetchList<PersonalDocument>(
            `/personnel/documents${query ? `?${query}` : ""}`,
        );
    },

    get: (document_UUID: string): Promise<PersonalDocument> =>
        api<PersonalDocument>(`/personnel/documents/${document_UUID}`),

    create: (data: {
        emp_UUID: string;
        kind: "License" | "Training" | "Medical" | "Company ID" | "Other";
        name: string;
        reference?: string | null;
        date_issued: string;
        expiry_date?: string | null;
        renewal_date?: string | null;
        file_path?: string | null;
        remarks?: string | null;
    }): Promise<PersonalDocument> =>
        api<PersonalDocument>("/personnel/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    update: (
        document_UUID: string,
        data: {
            kind?: "License" | "Training" | "Medical" | "Company ID" | "Other";
            name?: string;
            reference?: string | null;
            date_issued?: string;
            expiry_date?: string | null;
            renewal_date?: string | null;
            file_path?: string | null;
            remarks?: string | null;
        },
    ): Promise<PersonalDocument> =>
        api<PersonalDocument>(`/personnel/documents/${document_UUID}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    delete: (document_UUID: string): Promise<{ deleted: boolean }> =>
        api<{ deleted: boolean }>(`/personnel/documents/${document_UUID}`, {
            method: "DELETE",
        }),
};

export const licensesApi = {
    list: (emp_UUID: string): Promise<LicenseListResponse> =>
        fetchList<EmployeeLicense>(`/personnel/employees/${emp_UUID}/licenses`),

    get: (emp_license_UUID: string): Promise<EmployeeLicense> =>
        api<EmployeeLicense>(`/personnel/licenses/${emp_license_UUID}`),

    create: (
        emp_UUID: string,
        data: {
            license_type_UUID: string;
            renewal_status_UUID: string;
            license_number: string;
            issuing_authority: string;
            date_issued: string;
            expiry_date?: string | null;
            remarks?: string | null;
        },
    ): Promise<EmployeeLicense> =>
        api<EmployeeLicense>(`/personnel/employees/${emp_UUID}/licenses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    update: (
        emp_license_UUID: string,
        data: {
            license_type_UUID?: string;
            renewal_status_UUID?: string;
            license_number?: string;
            issuing_authority?: string;
            date_issued?: string;
            expiry_date?: string | null;
            remarks?: string | null;
        },
    ): Promise<EmployeeLicense> =>
        api<EmployeeLicense>(`/personnel/licenses/${emp_license_UUID}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    delete: (emp_license_UUID: string): Promise<{ deleted: boolean }> =>
        api<{ deleted: boolean }>(`/personnel/licenses/${emp_license_UUID}`, {
            method: "DELETE",
        }),
};
