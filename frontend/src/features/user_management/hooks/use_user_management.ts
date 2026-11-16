import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { account_previews, save_account_preview } from "../data/user_management_store";
import { list_accounts } from "../services/user_account_service";
import type { AccountAccessPreview, UserAccount } from "../types/user_account";

export function useUserAccounts(owner: string) {
    const [accounts, set_accounts] = useState<UserAccount[]>([]);
    const [previews, set_previews] = useState(() => account_previews(owner));
    const [loading, set_loading] = useState(true);
    const [error, set_error] = useState<Error>();
    const [version, set_version] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        void list_accounts(controller.signal)
            .then((rows) => {
                if (!controller.signal.aborted) set_accounts(rows);
            })
            .catch((cause: unknown) => {
                if (!controller.signal.aborted) set_error(cause instanceof Error ? cause : new Error("Unable to load accounts."));
            })
            .finally(() => {
                if (!controller.signal.aborted) set_loading(false);
            });
        return () => controller.abort();
    }, [version]);

    function reload() {
        set_error(undefined);
        set_loading(true);
        set_version((value) => value + 1);
    }

    function save_preview(account_id: string, preview: AccountAccessPreview) {
        if (account_id !== owner) set_previews(save_account_preview(owner, account_id, preview));
    }

    return { accounts, previews, loading, error, reload, save_preview, owner };
}

type UserAccountsContext = ReturnType<typeof useUserAccounts>;

export default function useUserManagement() {
    return useOutletContext<UserAccountsContext>();
}
