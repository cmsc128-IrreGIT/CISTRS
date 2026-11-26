import type { AccountAccessPreview } from "../types/user_account";

const previews = new Map<string, Map<string, AccountAccessPreview>>();

export function account_previews(owner: string) {
    return previews.get(owner);
}

export function save_account_preview(
    owner: string,
    account_id: string,
    preview: AccountAccessPreview,
) {
    const next = new Map(previews.get(owner)).set(account_id, preview);
    previews.set(owner, next);
    return next;
}
