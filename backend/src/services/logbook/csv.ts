// =============================================================================
// Minimal CSV writer (RFC 4180): comma separated, CRLF line ends, fields that
// contain a comma, quote or line break are quoted with quotes doubled.
//
// Spreadsheet safety: text that starts with = + - @ (or a tab / carriage
// return) would be run as a formula when the file is opened in Excel, so such
// text is prefixed with an apostrophe. Numbers are never altered.
// =============================================================================

export type CsvValue = string | number | null | undefined;

function cell(value: CsvValue): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") return String(value);

    const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: CsvValue[][]): string {
    return rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
