import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { list_personnel } from "../../personnel/services/personnel_service";
import { account_previews, save_account_preview } from "../data/user_management_store";
import { list_accounts } from "../services/user_account_service";
import type { AccountAccessPreview, UserAccount } from "../types/user_account";

export function useUserAccounts(owner: string, can_read_personnel: boolean) {
    const [accounts, set_accounts] = useState<UserAccount[]>([]);
    const [previews, set_previews] = useState(() => account_previews(owner));
    const [loading, set_loading] = useState(true);
    const [error, set_error] = useState<Error>();
    const [version, set_version] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        const directory = can_read_personnel ? list_personnel(controller.signal).catch(() => []) : Promise.resolve([]);
        void Promise.all([list_accounts(controller.signal), directory])
            .then(([rows, employees]) => {
                if (controller.signal.aborted) return;
                const names = new Map(employees.map(({ id, name }) => [id, name]));
                set_accounts(rows.map((row) => ({ ...row, full_name: names.get(row.employee.emp_UUID) })));
            })
            .catch((cause: unknown) => {
                if (!controller.signal.aborted) set_error(cause instanceof Error ? cause : new Error("Unable to load accounts."));
            })
            .finally(() => {
                if (!controller.signal.aborted) set_loading(false);
            });
        return () => controller.abort();
    }, [can_read_personnel, version]);

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
