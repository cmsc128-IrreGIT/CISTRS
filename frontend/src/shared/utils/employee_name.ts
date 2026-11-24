type NameFields = {
    f_name?: string | null;
    m_name?: string | null;
    l_name?: string | null;
    suffix?: string | null;
};

export function employee_name({ f_name, m_name, l_name, suffix }: NameFields) {
    return [f_name, m_name, l_name, suffix]
        .map((value) => value?.trim())
        .filter(Boolean)
        .join(" ");
}
