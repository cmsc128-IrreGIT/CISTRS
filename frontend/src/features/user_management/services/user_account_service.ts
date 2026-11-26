import { api } from "../../../shared/api/client";
import { employee_name } from "../../../shared/utils/employee_name";
import type { CreateAccount, UserAccount } from "../types/user_account";

type EligibleEmployee = {
    emp_UUID: string;
    emp_number: string;
    f_name: string;
    m_name?: string | null;
    l_name: string;
    suffix?: string | null;
    position?: { position_name: string } | null;
};

export async function list_eligible_employees(signal: AbortSignal) {
    const employees = await api<EligibleEmployee[]>(
        "/users/eligible-employees",
        { signal },
    );
    return employees.map((employee) => ({
        id: employee.emp_UUID,
        employee_number: employee.emp_number,
        name: employee_name(employee),
        position: employee.position?.position_name ?? "Not recorded",
    }));
}

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
