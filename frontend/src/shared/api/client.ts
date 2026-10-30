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
        throw new Error(
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
