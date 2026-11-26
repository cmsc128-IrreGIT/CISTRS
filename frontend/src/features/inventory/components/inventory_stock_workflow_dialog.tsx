import { useRef, useState } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";
import DetailsList from "../../../shared/components/ui/details_list";
import FormDialog from "../../../shared/components/ui/form_dialog";
import FormField from "../../../shared/components/forms/form_field";
import { useAircraftData } from "../../aircraft/hooks/use_aircraft";
import { INVENTORY_FORM_INPUT } from "../constants/inventory_form_constants";
import {
    MAX_LOCATION_QUANTITY,
    STOCK_WORKFLOW_DIALOG_CONTENT,
    STOCK_WORKFLOW_TITLES,
} from "../constants/inventory_workflow_constants";
import useInventoryLocations from "../hooks/use_inventory_locations";
import {
    assign_inventory_stock,
    get_inventory_item,
    set_inventory_stock,
} from "../services/inventory_services";
import type { InventoryItem } from "../types/inventory_types";
import { format_signed_quantity } from "../utils/stock_history";
import { inventory_location_label } from "../utils/inventory_workflows";
import InventoryQuantityField from "./inventory_quantity_field";
import {
    WorkflowActions,
    WorkflowError,
    WorkflowInput,
    WorkflowNotice,
    WorkflowSelect,
} from "./inventory_workflow_fields";

type Mode = keyof typeof STOCK_WORKFLOW_TITLES;
type Draft = {
    quantity: number;
    aircraft: string;
    remarks: string;
};

export default function InventoryStockWorkflowDialog({
    mode,
    item,
    on_close,
    on_saved,
}: {
    mode: Mode;
    item: InventoryItem;
    on_close: () => void;
    on_saved: () => void;
}) {
    const [is_saving, set_is_saving] = useState(false);
    const saving = useRef(false);
    const [save_error, set_save_error] = useState<string | null>(null);
    const [location_id, set_location_id] = useState("");
    const [draft, set_draft] = useState<Draft>();
    const [counted, set_counted] = useState("");
    const [step, set_step] = useState<"form" | "review">("form");
    const aircraft_state = useAircraftData();
    const aircraft = aircraft_state.aircraft;
    const issue = mode === "issue";
    const correction = mode === "correction";
    const unit = item.unit_of_measure;
    const location_state = useInventoryLocations();
    const quantity_at = (id: string) =>
        item.locations.find((location) => location.location_UUID === id)
            ?.current_quantity ?? 0;
    const locations = location_state.locations.filter(
        (location) => !issue || quantity_at(location.location_UUID) > 0,
    );
    const selected =
        locations.find((location) => location.location_UUID === location_id) ??
        (locations.length === 1 ? locations[0] : undefined);
    const balance = selected ? quantity_at(selected.location_UUID) : 0;

    function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (name: string) => String(data.get(name) ?? "").trim();
        const values: Draft = {
            quantity: Number(text("quantity")),
            aircraft: text("aircraft"),
            remarks: text("remarks"),
        };
        if (!selected || ((issue || correction) && !values.remarks)) {
            set_save_error("Complete all required fields before continuing.");
        } else if (
            !Number.isSafeInteger(values.quantity) ||
            values.quantity < (correction ? 0 : 1) ||
            values.quantity > MAX_LOCATION_QUANTITY
        ) {
            set_save_error("Enter a valid whole quantity.");
        } else if (
            issue &&
            !aircraft.some((row) => row.id === values.aircraft)
        ) {
            set_save_error("Select the aircraft receiving this stock.");
        } else if (issue && values.quantity > balance) {
            set_save_error(
                `Only ${balance} ${unit} are available at this location.`,
            );
        } else if (correction && values.quantity === balance) {
            set_save_error(
                "The counted quantity already matches recorded stock.",
            );
        } else {
            set_draft(values);
            set_save_error(null);
            set_step("review");
        }
    }

    async function save() {
        if (!draft || !selected || saving.current) return;
        const remarks = draft.remarks;
        if (remarks.length > 500) {
            set_save_error(
                "Remarks must be at most 500 characters. Use Back to shorten them.",
            );
            return;
        }
        saving.current = true;
        set_is_saving(true);
        set_save_error(null);
        try {
            if (issue) {
                await assign_inventory_stock(
                    item.part_UUID,
                    draft.aircraft,
                    selected.location_UUID,
                    draft.quantity,
                    remarks,
                );
            } else {
                const fresh = await get_inventory_item(item.part_UUID);
                const current =
                    fresh.locations.find(
                        (location) =>
                            location.location_UUID === selected.location_UUID,
                    )?.current_quantity ?? 0;
                if (current !== balance)
                    throw new Error(
                        "Stock has changed since this form opened. Close and reopen it to review the latest quantity.",
                    );
                const quantity = correction
                    ? draft.quantity
                    : current + draft.quantity;
                if (quantity > MAX_LOCATION_QUANTITY)
                    throw new Error(
                        "The resulting location quantity exceeds the allowed maximum.",
                    );
                await set_inventory_stock(
                    item.part_UUID,
                    selected.location_UUID,
                    quantity,
                    remarks,
                );
            }
            toast.success(
                issue
                    ? "Stock issued."
                    : correction
                      ? "Stock corrected."
                      : "Stock received.",
                { position: "bottom-right" },
            );
            on_saved();
            on_close();
        } catch (cause) {
            set_save_error(
                cause instanceof Error
                    ? cause.message
                    : "Stock could not be saved. Try again.",
            );
        } finally {
            saving.current = false;
            set_is_saving(false);
        }
    }
    return (
        <FormDialog
            title={
                step === "review"
                    ? issue
                        ? "Review stock issue"
                        : correction
                          ? "Review stock correction"
                          : "Review stock receipt"
                    : STOCK_WORKFLOW_TITLES[mode]
            }
            compact
            on_close={on_close}
            is_busy={is_saving}
        >
            {step === "review" && draft && selected ? (
                <>
                    <div className={STOCK_WORKFLOW_DIALOG_CONTENT}>
                        <WorkflowError message={save_error} />
                        {issue && aircraft_state.error && (
                            <div>
                                <WorkflowError message={aircraft_state.error} />
                                <button
                                    type="button"
                                    className="underline"
                                    onClick={() => void aircraft_state.reload()}
                                >
                                    Retry aircraft
                                </button>
                            </div>
                        )}
                        {!issue && (
                            <WorkflowNotice>
                                This quantity change is saved as an adjustment
                                in Stock history.
                            </WorkflowNotice>
                        )}
                        <div className="rounded-md bg-slate-100 p-4">
                            <DetailsList
                                entries={[
                                    {
                                        id: "item",
                                        label: "Item",
                                        value: item.part_name,
                                    },
                                    {
                                        id: "quantity",
                                        label: issue
                                            ? "Quantity issued"
                                            : correction
                                              ? "Counted quantity"
                                              : "Quantity received",
                                        value: `${draft.quantity} ${unit}`,
                                    },
                                    {
                                        id: "balance",
                                        label: "New location balance",
                                        value: `${correction ? draft.quantity : balance + (issue ? -draft.quantity : draft.quantity)} ${unit}`,
                                    },
                                    ...(!correction
                                        ? [
                                              {
                                                  id: "contact",
                                                  label: issue
                                                      ? "Recipient"
                                                      : "Supplier",
                                                  value: "Unavailable",
                                              },
                                              {
                                                  id: "date",
                                                  label: issue
                                                      ? "Issue date"
                                                      : "Date received",
                                                  value: "Unavailable",
                                              },
                                          ]
                                        : []),
                                    {
                                        id: "location",
                                        label: "Location / Storage area",
                                        value: inventory_location_label(
                                            selected,
                                        ),
                                    },
                                    ...(issue
                                        ? [
                                              {
                                                  id: "aircraft",
                                                  label: "Aircraft",
                                                  value:
                                                      aircraft.find(
                                                          (row) =>
                                                              row.id ===
                                                              draft.aircraft,
                                                      )?.registration || "—",
                                              },
                                          ]
                                        : []),
                                    {
                                        id: "reference",
                                        label: correction
                                            ? "Supporting reference"
                                            : issue
                                              ? "Work order / reference"
                                              : "Delivery reference",
                                        value: "Unavailable",
                                    },
                                    {
                                        id: "remarks",
                                        label: issue ? "Purpose" : "Remarks",
                                        value: draft.remarks || "—",
                                    },
                                ]}
                            />
                        </div>
                        {issue && item.total_quantity === draft.quantity && (
                            <WorkflowNotice>
                                This issue will leave the item out of stock.
                            </WorkflowNotice>
                        )}
                    </div>
                    <WorkflowActions
                        label={
                            issue
                                ? "Issue stock"
                                : correction
                                  ? "Save correction"
                                  : "Receive stock"
                        }
                        type="button"
                        is_saving={is_saving}
                        cancel_label="Back"
                        on_cancel={() => set_step("form")}
                        on_confirm={() => void save()}
                    />
                </>
            ) : location_state.is_loading ? (
                <p className={STOCK_WORKFLOW_DIALOG_CONTENT}>
                    Loading locations...
                </p>
            ) : location_state.error ? (
                <div className={STOCK_WORKFLOW_DIALOG_CONTENT}>
                    <WorkflowError message={location_state.error} />
                    <button
                        type="button"
                        className="underline"
                        onClick={() => void location_state.reload()}
                    >
                        Try again
                    </button>
                </div>
            ) : !locations.length ? (
                <div className={STOCK_WORKFLOW_DIALOG_CONTENT}>
                    <p className="text-sm text-slate-600">
                        {issue
                            ? "No location has stock available to issue."
                            : "No inventory locations are available."}
                    </p>
                </div>
            ) : (
                <form onSubmit={submit}>
                    <fieldset
                        disabled={is_saving}
                        className={STOCK_WORKFLOW_DIALOG_CONTENT}
                    >
                        <WorkflowError message={save_error} />
                        {issue && aircraft_state.loading && (
                            <p className="text-sm text-slate-600">
                                Loading aircraft...
                            </p>
                        )}
                        {issue && aircraft_state.error && (
                            <div>
                                <WorkflowError message={aircraft_state.error} />
                                <button
                                    type="button"
                                    className="underline"
                                    onClick={() => void aircraft_state.reload()}
                                >
                                    Retry aircraft
                                </button>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm">
                            <p className="min-w-0 wrap-anywhere font-semibold">
                                {item.part_name}
                            </p>
                            <p className="border-l border-slate-300 pl-3 text-slate-600">
                                <span className="font-semibold text-[#0b2238]">
                                    {item.total_quantity} {unit}
                                </span>{" "}
                                currently available
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <p className="text-xs text-slate-600 sm:col-span-2">
                                <span className="text-red-700">*</span>{" "}
                                indicates a required field.
                            </p>
                            <div
                                className={issue ? "min-w-0" : "sm:col-span-2"}
                            >
                                <FormField
                                    label="Location / Storage area"
                                    required
                                >
                                    {(props) => (
                                        <select
                                            {...props}
                                            value={
                                                selected?.location_UUID ?? ""
                                            }
                                            className={INVENTORY_FORM_INPUT}
                                            onChange={(event) =>
                                                set_location_id(
                                                    event.currentTarget.value,
                                                )
                                            }
                                        >
                                            <option value="">
                                                Select a location
                                            </option>
                                            {locations.map((location) => (
                                                <option
                                                    key={location.location_UUID}
                                                    value={
                                                        location.location_UUID
                                                    }
                                                >
                                                    {inventory_location_label(
                                                        location,
                                                    )}{" "}
                                                    ·{" "}
                                                    {quantity_at(
                                                        location.location_UUID,
                                                    )}{" "}
                                                    {unit}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </FormField>
                            </div>
                            <InventoryQuantityField
                                name="quantity"
                                label={
                                    correction
                                        ? "Counted quantity"
                                        : issue
                                          ? "Quantity issued"
                                          : "Quantity received"
                                }
                                placeholder={
                                    correction
                                        ? "Enter counted quantity"
                                        : "Enter quantity"
                                }
                                min={correction ? 0 : 1}
                                max={MAX_LOCATION_QUANTITY}
                                default_value={
                                    draft?.quantity ??
                                    (correction && counted
                                        ? Number(counted)
                                        : undefined)
                                }
                                on_value_change={
                                    correction ? set_counted : undefined
                                }
                            />
                            {issue && (
                                <WorkflowSelect
                                    label="Aircraft"
                                    name="aircraft"
                                    required
                                    default_value={draft?.aircraft ?? ""}
                                >
                                    <option value="">
                                        {aircraft.length
                                            ? "Select an aircraft"
                                            : "No aircraft available"}
                                    </option>
                                    {aircraft.map((row) => (
                                        <option key={row.id} value={row.id}>
                                            {row.registration}
                                        </option>
                                    ))}
                                </WorkflowSelect>
                            )}
                            {!correction && (
                                <WorkflowInput
                                    name="movement_date"
                                    label={
                                        issue ? "Issue date" : "Date received"
                                    }
                                    unavailable
                                />
                            )}
                            {issue && (
                                <WorkflowInput
                                    name="contact"
                                    label="Recipient"
                                    placeholder="Enter recipient name"
                                    unavailable
                                />
                            )}
                            {!issue && !correction && (
                                <WorkflowInput
                                    name="contact"
                                    label="Supplier"
                                    unavailable
                                />
                            )}
                            {correction && (
                                <WorkflowInput
                                    name="remarks"
                                    label="Reason"
                                    placeholder="Explain why the count differs"
                                    required
                                    default_value={draft?.remarks}
                                />
                            )}
                            <WorkflowInput
                                name="reference"
                                label={
                                    correction
                                        ? "Supporting reference"
                                        : issue
                                          ? "Work order / reference"
                                          : "Delivery reference"
                                }
                                placeholder={
                                    correction
                                        ? "Enter supporting reference"
                                        : issue
                                          ? "Enter work order or reference"
                                          : "Enter delivery reference"
                                }
                                unavailable
                            />
                            {!correction && (
                                <div className="sm:col-span-2">
                                    <WorkflowInput
                                        name="remarks"
                                        label={issue ? "Purpose" : "Remarks"}
                                        placeholder={
                                            issue
                                                ? "Enter the reason for this issue"
                                                : "Add notes about this receipt (optional)"
                                        }
                                        required={issue}
                                        multiline
                                        rows={3}
                                        default_value={draft?.remarks}
                                    />
                                </div>
                            )}
                        </div>
                        {correction ? (
                            <WorkflowNotice>
                                Recorded balance:{" "}
                                {selected
                                    ? `${balance} ${unit}`
                                    : "select a location"}
                                .
                                {selected &&
                                counted &&
                                Number.isSafeInteger(Number(counted)) &&
                                Number(counted) >= 0
                                    ? ` Proposed change: ${format_signed_quantity(Number(counted) - balance)} ${unit}.`
                                    : ""}{" "}
                                A correction would be recorded as a separate
                                adjustment.
                            </WorkflowNotice>
                        ) : (
                            <p className="rounded-md bg-slate-100 p-3 text-xs text-slate-700">
                                {issue
                                    ? `An issue deducts stock from the selected location. Available: ${selected ? `${balance} ${unit}` : "select a location"}.`
                                    : "A receipt adds stock to the selected location and appears in Stock History."}
                            </p>
                        )}
                    </fieldset>
                    <WorkflowActions
                        label={
                            correction
                                ? "Review correction"
                                : issue
                                  ? "Review issue"
                                  : "Review receipt"
                        }
                        on_cancel={on_close}
                        disabled={
                            issue &&
                            (aircraft_state.loading ||
                                Boolean(aircraft_state.error))
                        }
                    />
                </form>
            )}
        </FormDialog>
    );
}
