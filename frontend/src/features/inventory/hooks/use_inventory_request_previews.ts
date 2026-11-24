import { useSyncExternalStore } from "react";
import type {
    InventoryRequestPreview,
    InventoryRequestDecision,
} from "../types/inventory_types";

type PreviewInput = Pick<
    InventoryRequestPreview,
    "kind" | "part" | "quantity" | "reason"
> &
    Partial<
        Pick<
            InventoryRequestPreview,
            "location" | "recorded_quantity" | "needed_by" | "reference"
        >
    >;

const empty: InventoryRequestPreview[] = [];
let previews = empty;
let next_id = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function notify() {
    listeners.forEach((listener) => listener());
}

export function useInventoryRequestPreviews() {
    return useSyncExternalStore(
        subscribe,
        () => previews,
        () => empty,
    );
}

export function add_inventory_request_preview(
    input: PreviewInput,
    username: string,
) {
    previews = [
        {
            location: null,
            recorded_quantity: null,
            needed_by: null,
            reference: null,
            ...input,
            request_UUID: `preview-${++next_id}`,
            status: "PENDING",
            requester: username,
            reviewer: null,
            review_note: null,
            created_at: new Date().toISOString(),
            reviewed_at: null,
        },
        ...previews,
    ];
    notify();
}

export function review_inventory_request_preview(
    id: string,
    decision: InventoryRequestDecision,
    username: string,
) {
    previews = previews.map((request) =>
        request.request_UUID === id && request.status === "PENDING"
            ? {
                  ...request,
                  status: decision.status,
                  review_note:
                      decision.status === "RETURNED"
                          ? decision.review_note
                          : null,
                  reviewer: username,
                  reviewed_at: new Date().toISOString(),
              }
            : request,
    );
    notify();
}
