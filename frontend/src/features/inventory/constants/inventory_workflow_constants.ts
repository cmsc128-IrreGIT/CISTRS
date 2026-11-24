export const STOCK_WORKFLOW_TITLES = {
    receive: "Receive stock",
    issue: "Issue stock",
    correction: "Request stock correction",
} as const;

export const INVENTORY_REQUEST_PAGE_COPY = {
    RESTOCK: {
        title: "Restock requests",
        quantity_header: "Requested quantity",
        destination_header: "Required by",
        empty_title: "No restock previews yet",
        empty_description: "Use Request stock to preview a request.",
    },
    CORRECTION: {
        title: "Stock corrections",
        quantity_header: "Counted quantity",
        destination_header: "Location / Storage Area",
        empty_title: "No stock correction previews yet",
        empty_description: "Open an item to preview a stock correction.",
    },
} as const;

export const STOCK_WORKFLOW_DIALOG_CONTENT = "space-y-4 px-4 py-4 sm:px-5";

export const REQUEST_STATUS_LABELS = {
    PENDING: "Submitted",
    APPROVED: "Approved",
    RETURNED: "Returned",
} as const;

export const MAX_LOCATION_QUANTITY = 2_147_483_647;

export const STOCK_PREVIEW_NOTICE =
    "Preview only. Stock quantities and movement history will not change.";
export const REQUEST_PREVIEW_NOTICE =
    "Preview requests stay in this page session. They are not submitted or saved.";
