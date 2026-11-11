const date_format = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
});

export default function DashboardDate({ value }: { value: string }) {
    const date = new Date(
        /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value,
    );
    if (Number.isNaN(date.getTime())) return "—";
    return <time dateTime={value}>{date_format.format(date)}</time>;
}
