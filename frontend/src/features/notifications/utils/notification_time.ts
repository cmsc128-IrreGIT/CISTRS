export function notification_date_group(value: string, now = new Date()) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Date unavailable";
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (
        date >= today &&
        date <
            new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    )
        return "Today";
    if (date >= yesterday && date < today) return "Yesterday";
    return date < yesterday ? "Earlier" : "Other dates";
}
export function notification_relative_time(value: string, now = new Date()) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Date unavailable";
    const seconds = (date.getTime() - now.getTime()) / 1000;
    if (Math.abs(seconds) < 60)
        return seconds <= 0 ? "Just now" : "In less than a minute";
    const formatter = new Intl.RelativeTimeFormat(undefined, {
        numeric: "auto",
    });
    if (Math.abs(seconds) < 3600)
        return formatter.format(Math.trunc(seconds / 60), "minute");
    if (Math.abs(seconds) < 86400)
        return formatter.format(Math.trunc(seconds / 3600), "hour");
    return formatter.format(Math.trunc(seconds / 86400), "day");
}
