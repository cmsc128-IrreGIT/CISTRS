import { useContext, useState } from "react";
import type { SubmitEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import Button from "../../../shared/components/ui/button";
import DetailsList from "../../../shared/components/ui/details_list";
import FormDialog from "../../../shared/components/ui/form_dialog";
import FormField from "../../../shared/components/forms/form_field";
import { AuthContext } from "../../auth/hooks/auth_context";
import StatusBadge from "../../../shared/components/ui/status_badge";
import { INVENTORY_FORM_INPUT } from "../constants/inventory_form_constants";
import {
    REQUEST_PREVIEW_NOTICE,
    REQUEST_STATUS_LABELS,
    STOCK_PREVIEW_NOTICE,
    STOCK_WORKFLOW_DIALOG_CONTENT,
} from "../constants/inventory_workflow_constants";
import { add_inventory_request_preview, review_inventory_request_preview } from "../hooks/use_inventory_request_previews";
import type { InventoryItem, InventoryRequestPreview, InventoryRequestDecision } from "../types/inventory_types";
import { format_signed_quantity } from "../utils/stock_history";
import {
    inventory_location_label,
    inventory_request_date,
    inventory_today,
} from "../utils/inventory_workflows";
import { WorkflowActions, WorkflowError, WorkflowInput, WorkflowNotice } from "./inventory_workflow_fields";

export function RequestStockDialog({
    items,
    on_close,
    on_preview,
}: {
    items: InventoryItem[];
    on_close: () => void;
    on_preview: () => void;
}) {
    const actor_name = useContext(AuthContext)?.user?.full_name || "Current user";
    const [error, set_error] = useState<string | null>(null);

    function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const reason = String(values.get("reason") ?? "").trim();
        if (!reason) {
            set_error("Enter a reason for the request.");
            return;
        }
        const part = items.find((item) => item.part_UUID === values.get("part_UUID"));
        if (!part) {
            set_error("Select an item for this preview.");
            return;
        }
        add_inventory_request_preview({
            kind: "RESTOCK",
            part,
            quantity: Number(values.get("quantity")),
            needed_by: String(values.get("needed_by")),
            reason,
        }, actor_name);
        on_preview();
    }

    return (
        <FormDialog title="Request stock" compact on_close={on_close}>
            <form onSubmit={submit}>
                <fieldset className={STOCK_WORKFLOW_DIALOG_CONTENT}>
                    <WorkflowError message={error} />
                    <WorkflowNotice>{REQUEST_PREVIEW_NOTICE}</WorkflowNotice>
                    <p className="text-xs text-slate-600"><span className="text-red-700">*</span> indicates a required field.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <FormField label="Item" required>
                            {(props) => (
                                <select {...props} name="part_UUID" defaultValue="" className={INVENTORY_FORM_INPUT}>
                                    <option value="">Select an item</option>
                                    {items.map((item) => <option key={item.part_UUID} value={item.part_UUID}>{item.part_name} · {item.part_number}</option>)}
                                </select>
                            )}
                        </FormField>
                        <WorkflowInput name="quantity" label="Quantity requested" type="number" required />
                        <WorkflowInput name="needed_by" label="Required by" type="date" default_value={inventory_today()} required />
                        <div className="sm:col-span-2"><WorkflowInput name="reason" label="Reason" required multiline /></div>
                    </div>
                </fieldset>
                <WorkflowActions label="Add request preview" on_cancel={on_close} />
            </form>
        </FormDialog>
    );
}

export function RequestDetailsDialog({
    request,
    can_review,
    on_close,
    on_reviewed,
}: {
    request: InventoryRequestPreview;
    can_review: boolean;
    on_close: () => void;
    on_reviewed: (status: InventoryRequestDecision["status"]) => void;
}) {
    const [returning, set_returning] = useState(false);
    const actor_name = useContext(AuthContext)?.user?.full_name || "Current user";
    const [error, set_error] = useState<string | null>(null);
    const correction = request.kind === "CORRECTION";
    const reviewable = can_review && request.status === "PENDING";
    const unit = request.part.unit_of_measure;
    const title = returning ? "Return request" : correction
        ? reviewable ? "Review stock correction" : "Stock correction details"
        : reviewable ? "Review restock request" : "Restock request details";

    function decide(decision: InventoryRequestDecision) {
        review_inventory_request_preview(request.request_UUID, decision, actor_name);
        on_reviewed(decision.status);
    }

    function return_request(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const review_note = String(data.get("review_note") ?? "").trim();
        if (!review_note) {
            set_error("Enter a reason for returning this request.");
            return;
        }
        decide({ status: "RETURNED", review_note });
    }

    return (
        <FormDialog title={title} compact on_close={on_close}>
            <form onSubmit={return_request}>
                <div className={STOCK_WORKFLOW_DIALOG_CONTENT}>
                    <WorkflowError message={error} />
                    <StatusBadge tone={request.status === "APPROVED" ? "success" : "warning"}>
                        {REQUEST_STATUS_LABELS[request.status]}
                    </StatusBadge>
                    <WorkflowNotice>{correction ? STOCK_PREVIEW_NOTICE : REQUEST_PREVIEW_NOTICE}</WorkflowNotice>
                    <div className="rounded-md bg-slate-100 p-4">
                        <DetailsList entries={[
                            { id: "item", label: "Item", value: request.part.part_name },
                            { id: "quantity", label: correction ? "Counted quantity" : "Quantity requested", value: `${request.quantity} ${unit}` },
                            ...(correction ? [
                                { id: "balance", label: "Recorded quantity", value: `${request.recorded_quantity ?? 0} ${unit}` },
                                { id: "change", label: "Proposed change", value: `${format_signed_quantity(request.quantity - (request.recorded_quantity ?? 0))} ${unit}` },
                                { id: "location", label: "Location / Storage area", value: request.location ? inventory_location_label(request.location) : "—" },
                                { id: "reference", label: "Supporting reference", value: request.reference || "—" },
                            ] : [
                                { id: "needed", label: "Required by", value: inventory_request_date(request.needed_by) },
                                { id: "date", label: "Date requested", value: inventory_request_date(request.created_at) },
                            ]),
                            { id: "requester", label: "Requested by", value: request.requester },
                            { id: "reason", label: "Reason", value: request.reason },
                            ...(request.reviewer ? [
                                { id: "reviewer", label: "Reviewed by", value: request.reviewer },
                                { id: "reviewed", label: "Reviewed on", value: inventory_request_date(request.reviewed_at) },
                            ] : []),
                            ...(request.review_note ? [{ id: "note", label: "Review note", value: request.review_note }] : []),
                        ]} />
                    </div>
                    {returning && (
                        <WorkflowInput name="review_note" label="Reason for return" required multiline />
                    )}
                </div>
                {reviewable ? (
                    <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
                        <Button variant="secondary" className="mr-auto" onClick={() => {
                            if (returning) {
                                set_returning(false);
                                set_error(null);
                            } else on_close();
                        }}>Cancel</Button>
                        {returning ? (
                            <Button type="submit" className="bg-[#0b2238]!">Preview return</Button>
                        ) : (
                            <>
                                <Button variant="secondary" onClick={() => {
                                    set_error(null);
                                    set_returning(true);
                                }}>Return for revision</Button>
                                <Button className="bg-emerald-700! hover:bg-emerald-800!"
                                    onClick={() => decide({ status: "APPROVED" })}>
                                    Preview approval
                                </Button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex justify-end border-t border-slate-200 px-4 py-3 sm:px-5">
                        <Button onClick={on_close} className="bg-[#0b2238]!">Close</Button>
                    </div>
                )}
            </form>
        </FormDialog>
    );
}

export function RequestResultDialog({ message, on_close }: { message: string; on_close: () => void }) {
    return (
        <FormDialog title={message} compact on_close={on_close}>
            <div className="flex flex-col items-center gap-4 p-5 text-center">
                <CheckCircle2 className="text-emerald-700" size={32} aria-hidden="true" />
                <p className="text-sm text-slate-600">{REQUEST_PREVIEW_NOTICE}</p>
                <Button onClick={on_close} className="bg-[#0b2238]!">Done</Button>
            </div>
        </FormDialog>
    );
}
