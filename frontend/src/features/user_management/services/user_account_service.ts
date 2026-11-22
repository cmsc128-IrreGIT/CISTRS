import { api } from "../../../shared/api/client";
import type { CreateAccount, UserAccount } from "../types/user_account";

export function list_accounts(signal: AbortSignal) {
    return api<UserAccount[]>("/users", { signal });
}

export function create_account(values: CreateAccount) {
    return api<unknown>("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
    });
}
