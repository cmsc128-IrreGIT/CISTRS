import { useState } from "react";
import type { SubmitEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import Button from "../../../shared/components/ui/button";
import EmptyState from "../../../shared/components/feedback/empty_state";
import FormDialog from "../../../shared/components/ui/form_dialog";
import FormField from "../../../shared/components/forms/form_field";
import { button_styles } from "../../../shared/styles/button_styles";
import { aircraft_service } from "../services/aircraft_service";
import { useAircraftData } from "../hooks/use_aircraft";
import useAircraftStatuses from "../hooks/use_aircraft_statuses";
import AircraftDetailsPage from "./aircraft_details_page";

const input_style =
    "min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8] aria-invalid:border-red-500";

export default function AircraftStatusPage() {
    const { aircraft, is_loading, error: aircraft_error, reload } = useAircraftData();
    const { statuses, is_loading: statuses_loading, error: statuses_error } =
        useAircraftStatuses();
    const { aircraft_id } = useParams();
    const navigate = useNavigate();
    const record = aircraft.find((row) => row.aircraft_UUID === aircraft_id);
    const destination = aircraft_id ? `/aircraft/${aircraft_id}` : "/aircraft";
    const [draft, set_draft] = useState<{
        aircraft_UUID: string;
        status_id: string;
        current_hours: string;
    } | null>(null);
    const [form_error, set_form_error] = useState("");
    const [saving, set_saving] = useState(false);
    const status_id =
        record && draft?.aircraft_UUID === record.aircraft_UUID
            ? draft.status_id
            : record?.status.aircraft_status_UUID ?? "";
    const current_hours =
        record && draft?.aircraft_UUID === record.aircraft_UUID
            ? draft.current_hours
            : String(record?.current_hours ?? "");

    async function save(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!record) return;

        const hours = Number(current_hours);
        if (
            !status_id ||
            !current_hours.trim() ||
            !Number.isFinite(hours) ||
            hours < 0 ||
            hours > 99_999_999.99
        ) {
            set_form_error("Choose a status and enter a valid nonnegative hours value.");
            return;
        }
        if (Math.abs(hours * 100 - Math.round(hours * 100)) > 1e-6) {
            set_form_error("Current hours can have at most 2 decimal places.");
            return;
        }

        set_saving(true);
        set_form_error("");
        try {
            await aircraft_service.update_status(record.aircraft_UUID, {
                aircraft_status_UUID: status_id,
                current_hours: hours,
            });
            toast.success("Aircraft status updated", { position: "bottom-right" });
            void navigate(destination);
        } catch (cause) {
            set_form_error(
                cause instanceof Error ? cause.message : "Could not update aircraft status.",
            );
        } finally {
            set_saving(false);
        }
    }

    return (
        <>
            <AircraftDetailsPage />
            <FormDialog title="Update aircraft status" compact on_close={() => void navigate(destination)}>
                <div className="space-y-4 p-4 sm:p-5">
                    {is_loading ? (
                        <p role="status" className="text-sm text-slate-600">Loading aircraft…</p>
                    ) : aircraft_error ? (
                        <div role="alert" className="space-y-2 text-sm text-red-800">
                            <p>{aircraft_error}</p>
                            <Button variant="ghost" onClick={() => void reload()}>Retry</Button>
                        </div>
                    ) : !record ? (
                        <EmptyState
                            title="Aircraft not found"
                            description="Return to the aircraft list and select an existing record."
                        />
                    ) : statuses_error ? (
                        <p role="alert" className="text-sm text-red-800">
                            Could not load aircraft statuses: {statuses_error}
                        </p>
                    ) : statuses_loading ? (
                        <p role="status" className="text-sm text-slate-600">Loading statuses…</p>
                    ) : (
                        <form onSubmit={save} className="space-y-4">
                            <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                                Update the aircraft’s current status and recorded flight hours.
                            </p>
                            <FormField label="Aircraft status" required>
                                {(props) => (
                                    <select
                                        {...props}
                                        value={status_id}
                                        onChange={(event) => {
                                            if (!record) return;
                                            set_draft({
                                                aircraft_UUID: record.aircraft_UUID,
                                                status_id: event.currentTarget.value,
                                                current_hours,
                                            });
                                            set_form_error("");
                                        }}
                                        className={input_style}
                                    >
                                        <option value="">Select a status</option>
                                        {statuses.map((status) => (
                                            <option
                                                key={status.aircraft_status_UUID}
                                                value={status.aircraft_status_UUID}
                                            >
                                                {status.status_name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </FormField>
                            <FormField label="Current aircraft hours" required help="Use a nonnegative value with up to 2 decimal places.">
                                {(props) => (
                                    <input
                                        {...props}
                                        type="number"
                                        min="0"
                                        max="99999999.99"
                                        step="0.01"
                                        value={current_hours}
                                        onChange={(event) => {
                                            if (!record) return;
                                            set_draft({
                                                aircraft_UUID: record.aircraft_UUID,
                                                status_id,
                                                current_hours: event.currentTarget.value,
                                            });
                                            set_form_error("");
                                        }}
                                        className={input_style}
                                    />
                                )}
                            </FormField>
                            {form_error && (
                                <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                                    {form_error}
                                </p>
                            )}
                            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                                <Button
                                    variant="secondary"
                                    onClick={() => void navigate(destination)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" className={button_styles("primary")} disabled={saving}>
                                    {saving ? "Saving…" : "Save status"}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </FormDialog>
        </>
    );
}
