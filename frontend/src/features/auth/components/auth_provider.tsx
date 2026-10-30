import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import {
    api,
    get_token,
    set_token,
    ApiError,
} from "../../../shared/api/client";
import { AuthContext, type SessionUser } from "../hooks/auth_context";
export default function AuthProvider({ children }: { children: ReactNode }) {
    const [user, set_user] = useState<SessionUser | null>(null);
    const [loading, set_loading] = useState(() => !!get_token());
    const [error, set_error] = useState("");
    const generation = useRef(0);
    const restore = useCallback(() => {
        const current = ++generation.current;
        return api<SessionUser>("/auth/me")
            .then(
                (data) => {
                    if (current === generation.current) {
                        set_user(data);
                        set_error("");
                    }
                },
                (error: unknown) => {
                    if (current !== generation.current) return;
                    set_user(null);
                    if (
                        error instanceof ApiError &&
                        [401, 403].includes(error.status)
                    )
                        set_token(null);
                    else
                        set_error(
                            error instanceof Error
                                ? error.message
                                : "Unable to restore your session.",
                        );
                },
            )
            .finally(() => {
                if (current === generation.current) set_loading(false);
            });
    }, []);
    useEffect(() => {
        if (get_token()) void restore();
        const requests = generation;
        const expired = () => {
            ++generation.current;
            set_user(null);
            set_loading(false);
            set_error("");
        };
        window.addEventListener("cistrs:session-expired", expired);
        return () => {
            ++requests.current;
            window.removeEventListener("cistrs:session-expired", expired);
        };
    }, [restore]);
    async function login(username: string, password: string) {
        const current = ++generation.current;
        const data = await api<{ token: string; user: SessionUser }>(
            "/auth/login",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username.trim(), password }),
            },
        );
        if (current !== generation.current) return;
        set_token(data.token);
        set_user(data.user);
        set_error("");
        set_loading(false);
    }
    async function logout() {
        await api("/auth/logout", { method: "POST" });
        ++generation.current;
        set_token(null);
        set_user(null);
        set_error("");
    }
    return (
        <AuthContext
            value={{
                user,
                loading,
                error,
                retry: () => {
                    set_loading(true);
                    set_error("");
                    void restore();
                },
                login,
                logout,
            }}
        >
            {children}
        </AuthContext>
    );
}
