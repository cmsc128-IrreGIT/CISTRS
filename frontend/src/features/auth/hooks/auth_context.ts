import { createContext, useContext } from "react";
export type SessionUser = {
    account_UUID: string;
    emp_UUID: string;
    username: string;
    full_name?: string;
    roles?: string[];
    position?: {
        position_UUID: string;
        position_name: string;
    };
    features: string[];
};
export const AuthContext = createContext<{
    user: SessionUser | null;
    loading: boolean;
    error: string;
    retry: () => void;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
} | null>(null);
export function useAuth() {
    const value = useContext(AuthContext);
    if (!value) throw new Error("AuthProvider is required");
    return value;
}
