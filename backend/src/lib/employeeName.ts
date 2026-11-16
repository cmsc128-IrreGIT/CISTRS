/** Employee display names, with optional parts omitted. */
export function employeeFullName(employee: {
    f_name: string;
    m_name?: string | null;
    l_name: string;
    suffix?: string | null;
}): string {
    return [employee.f_name, employee.m_name, employee.l_name, employee.suffix]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(" ");
}
