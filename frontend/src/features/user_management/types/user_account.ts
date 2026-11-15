export type AccountPosition = { position_UUID: string; position_name: string };

export type UserAccount = {
    account_UUID: string;
    username: string;
    account_status: string;
    last_login_at: string | null;
    employee: {
        emp_UUID: string;
        emp_number: string;
        f_name: string;
        l_name: string;
        position?: AccountPosition | null;
    };
};

export type CreateAccount = { emp_UUID: string; username: string; password: string };

export type AccountAccessPreview = { status: string; duties: string[] };

export function account_name(account: UserAccount) {
    const { f_name, l_name } = account.employee;
    return [f_name, l_name].filter(Boolean).join(" ") || account.username;
}
