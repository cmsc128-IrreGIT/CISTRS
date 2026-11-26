export const linked_stock_note =
    "Stock was deducted when the issue was recorded. Linking it here leaves stock unchanged.";

export function format_work_date(date = "") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Not recorded";
    const value = new Date(`${date}T00:00:00Z`);
    return Number.isNaN(value.getTime())
        ? "Not recorded"
        : value.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
          });
}
