import type { StatusTone } from "../../../shared/components/ui/status_badge";

export const STOCK_HISTORY_PAGE_SIZE = 10;
export const STOCK_HISTORY_DATE_RANGES = [7, 30, 90] as const;

export const STOCK_MOVEMENT_LABELS: Readonly<Record<string, string>> = {
    ISSUE: "Issued",
    RECEIVE: "Received",
    RECEIPT: "Received",
    RETURN: "Returned",
    ADJUSTMENT: "Adjusted",
    TRANSFER: "Transferred",
};

export const STOCK_MOVEMENT_TONES: Readonly<Record<string, StatusTone>> = {
    Issued: "warning",
    Received: "success",
    Adjusted: "info",
};

export const STOCK_HISTORY_CSV_NAME = "cistrs-stock-history.csv";
export const STOCK_HISTORY_CSV_HEADERS = [
    "Date",
    "Item",
    "Part number",
    "Movement",
    "Quantity",
    "Reference",
    "Transaction ID",
    "Recipient",
    "Location",
    "Recorded by",
    "Remarks",
] as const;
