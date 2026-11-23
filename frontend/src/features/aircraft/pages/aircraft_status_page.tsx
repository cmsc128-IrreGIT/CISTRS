import { useRef, useState } from "react";
import type { SubmitEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import EmptyState from "../../../shared/components/feedback/empty_state";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import ErrorState from "../../../shared/components/feedback/error_state";
import FormField from "../../../shared/components/forms/form_field";
import FormDialog from "../../../shared/components/ui/form_dialog";
import Button from "../../../shared/components/ui/button";
import { INVENTORY_FORM_INPUT } from "../../inventory/constants/inventory_form_constants";
import { aircraft_service } from "../services/aircraft_service";
import { useAircraftData } from "../hooks/use_aircraft";
import type { AircraftStatusInput } from "../types/aircraft_types";
import AircraftDetailsPage from "./aircraft_details_page";

/*
const status_fields = [
    { key: "effective_date", label: "Effective date", type: "date" },
    { key: "reason", label: "Reason", type: "text" },
    ...aircraft_config.fields.filter((field) => field.key === "notes"),
];
*/

export default function AircraftStatusPage() {
    const { aircraft: rows, statuses, loading, error, reload } = useAircraftData();
    const { aircraft_id } = useParams();
    const navigate = useNavigate();
    const [saving, set_saving] = useState(false);
    const [save_error, set_save_error] = useState("");
    const pending = useRef(false);
    const record = rows.find((row) => row.id === aircraft_id);
    const destination = aircraft_id ? `/aircraft/${aircraft_id}` : "/aircraft";
    async function save(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!record || pending.current) return;
        const data = new FormData(event.currentTarget);
        const status = String(data.get("aircraft_status_UUID") ?? "");
        const hours_text = String(data.get("current_hours") ?? "").trim();
        const hours = Number(hours_text);
        set_save_error("");
        if (!statuses.some((row) => row.aircraft_status_UUID === status) || !hours_text ||
            !Number.isFinite(hours) || hours < 0 || hours > 99999999.99 || Math.abs(hours * 100 - Math.round(hours * 100)) >= 1e-6) {
            set_save_error("Select a valid status and enter hours with at most two decimal places.");
            return;
        }
        const values: AircraftStatusInput = {};
        if (status !== record.aircraft_status_UUID) values.aircraft_status_UUID = status;
        if (hours !== Number(record.current_aircraft_hours)) values.current_hours = hours;
        if (!Object.keys(values).length) { void navigate(destination); return; }
        pending.current = true;
        set_saving(true);
        try {
            await aircraft_service.update_status(record.id, values);
            toast.success("Aircraft status updated", { position: "bottom-right" });
            void navigate(destination);
        } catch (cause) { set_save_error(cause instanceof Error ? cause.message : "Could not save aircraft status."); }
        finally { pending.current = false; set_saving(false); }
    }
    return <>
        <AircraftDetailsPage />
        <FormDialog title="Update aircraft status" compact is_busy={saving} on_close={() => void navigate(destination)}>
            {loading ? <ScreenLoading compact label="Loading aircraft..." /> : error ? <ErrorState description={error} on_retry={reload} /> : record ? <form key={record.id} onSubmit={save}>
                <div className="space-y-4 p-4 sm:px-5">
                    <p className="text-sm font-semibold">{record.registration}</p>
                    <p className="text-xs text-slate-600"><span className="text-red-700">*</span> indicates a required field.</p>
                    {save_error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{save_error}</p>}
                    <fieldset disabled={saving} className="grid min-w-0 gap-3 sm:grid-cols-2">
                        <legend className="sr-only">Aircraft status and hours</legend>
                        <FormField label="Status" required>
                            {(props) => <select {...props} required name="aircraft_status_UUID" defaultValue={record.aircraft_status_UUID} className={INVENTORY_FORM_INPUT}>
                                {statuses.map((row) => <option key={row.aircraft_status_UUID} value={row.aircraft_status_UUID}>{row.status_name}</option>)}
                            </select>}
                        </FormField>
                        <FormField label="Current aircraft hours" required>
                            {(props) => <input {...props} required name="current_hours" type="number" min={0} max={99999999.99} step="0.01" defaultValue={record.current_aircraft_hours} className={INVENTORY_FORM_INPUT} />}
                        </FormField>
                    </fieldset>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 p-4 sm:px-5">
                    <Button type="button" variant="secondary" className="mr-auto" disabled={saving} onClick={() => void navigate(destination)}>Cancel</Button>
                    <Button type="submit" is_loading={saving} className="bg-[#152e45]! hover:bg-[#203f59]!">Save status</Button>
                </div>
            </form> : <div className="p-4"><EmptyState title="Aircraft not found" description="Return to the aircraft list and select an existing record." /></div>}
        </FormDialog>
    </>;
}
