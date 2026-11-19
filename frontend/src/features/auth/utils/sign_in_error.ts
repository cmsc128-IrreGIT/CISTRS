import { ApiConnectionError, ApiError } from "../../../shared/api/client";

const account_access_messages = new Set([
    "This account is not active. Contact an administrator.",
    "Your assigned position is inactive. Contact an administrator.",
    "No system features are assigned to your position. Contact an administrator.",
]);

export function sign_in_error(cause: unknown) {
    if (cause instanceof ApiError) {
        if (cause.status === 401) return "Invalid username or password. Check both and try again.";
        if (cause.status === 403) {
            return account_access_messages.has(cause.message)
                ? cause.message
                : "Your account cannot sign in. Contact your administrator.";
        }
        if (cause.status === 429) return "Too many sign-in attempts. Wait a moment and try again.";
    }
    if (cause instanceof ApiConnectionError) {
        return "Cannot reach the server. Check your connection and try again.";
    }
    if (cause instanceof Error && cause.name === "TimeoutError") {
        return "Sign-in took too long. Try again.";
    }
    return "Sign-in is temporarily unavailable. Try again in a moment.";
}
