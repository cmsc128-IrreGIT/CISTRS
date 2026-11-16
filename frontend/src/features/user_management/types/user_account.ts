import { employee_name } from "../../../shared/utils/employee_name";

export type AccountPosition = { position_UUID: string; position_name: string };

export type UserAccount = {
    account_UUID: string;
    username: string;
    account_status: string;
    last_login_at: string | null;
    full_name?: string;
    employee: {
        emp_UUID: string;
        emp_number: string;
        f_name: string;
        l_name: string;
        m_name?: string | null;
        suffix?: string | null;
        position?: AccountPosition | null;
    };
};

export type CreateAccount = { emp_UUID: string; username: string; password: string };

export type AccountAccessPreview = { status: string; duties: string[] };

export function account_name(account: UserAccount) {
    return account.full_name || employee_name(account.employee) || "Not recorded";
}
