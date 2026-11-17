import DetailsList from "../../../shared/components/ui/details_list";
import FormDialog from "../../../shared/components/ui/form_dialog";
import type { InventoryItem } from "../types/inventory_types";
import { WorkflowActions, WorkflowNotice } from "./inventory_workflow_fields";

export default function InventoryLifecycleDialog({
    item,
    restore = false,
    on_close,
    on_saved,
}: {
    item: InventoryItem;
    restore?: boolean;
    on_close: () => void;
    on_saved: () => void;
}) {
    return (
        <FormDialog title={restore ? "Restore part?" : "Decommission part?"} compact on_close={on_close}>
            <div className="space-y-3 p-4 sm:px-5">
                {restore ? (
                    <WorkflowNotice>Return this part to active inventory in this browser.</WorkflowNotice>
                ) : (
                    <p className="text-sm leading-relaxed text-slate-700">
                        Decommissioning removes this part from active inventory. Its stock history stays available.
                    </p>
                )}
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <DetailsList entries={[
                        {
                            id: "item",
                            label: "Item",
                            value: (
                                <div>
                                    <p className="font-semibold">{item.part_name}</p>
                                    <p className="mt-0.5 text-xs font-normal text-slate-600">{item.part_number}</p>
                                </div>
                            ),
                        },
                        {
                            id: "quantity",
                            label: "Available quantity",
                            value: `${item.total_quantity} ${item.unit_of_measure}`,
                        },
                    ]} />
                </div>
                {!restore && <p className="text-xs text-slate-600">This change only applies in this browser.</p>}
            </div>
            <WorkflowActions label={restore ? "Restore" : "Decommission"} tone={restore ? "success" : "danger"}
                type="button" on_cancel={on_close} on_confirm={on_saved} />
        </FormDialog>
    );
}
