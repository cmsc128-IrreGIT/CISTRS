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
import { get_personnel } from "../../personnel/services/personnel_service";
import { list_accounts } from "../../user_management/services/user_account_service";
import { employee_name } from "../../../shared/utils/employee_name";
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
    const employee_id = user?.emp_UUID;
    const account_id = user?.account_UUID;
    const may_read_personnel = user?.features.includes("Personnel") ?? false;
    const may_read_accounts = user?.features.includes("User Accounts") ?? false;
    const has_name = Boolean(user?.full_name?.trim());

    useEffect(() => {
        if (!employee_id || !account_id || has_name) return;
        if (!may_read_personnel && !may_read_accounts) return;

        const controller = new AbortController();
        const load_name = async () => {
            let full_name = "";
            if (may_read_personnel) {
                try {
                    const employee = await get_personnel(employee_id, controller.signal);
                    full_name = employee.name;
                } catch {
                    // A failed Personnel request can still fall back to User Accounts,
                    // but only when the signed-in account holds that feature.
                }
            }
            if (!full_name && may_read_accounts && !controller.signal.aborted) {
                try {
                    const accounts = await list_accounts(controller.signal);
                    const match = accounts.find((account) =>
                        account.account_UUID === account_id &&
                        account.employee.emp_UUID === employee_id,
                    );
                    if (match) full_name = match.full_name?.trim() || employee_name(match.employee);
                } catch {
                    // Profile names are optional; failed lookups must not end a session.
                }
            }
            if (!full_name.trim() || controller.signal.aborted) return;
            set_user((current) =>
                current?.account_UUID === account_id &&
                current.emp_UUID === employee_id &&
                !current.full_name?.trim()
                    ? { ...current, full_name: full_name.trim() }
                    : current,
            );
        };
        void load_name();
        return () => controller.abort();
    }, [account_id, employee_id, has_name, may_read_accounts, may_read_personnel]);

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
