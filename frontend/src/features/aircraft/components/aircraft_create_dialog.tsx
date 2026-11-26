import { useRef, useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import FormDialog from "../../../shared/components/ui/form_dialog";
import { INVENTORY_FORM_INPUT } from "../../inventory/constants/inventory_form_constants";
import { aircraft_service } from "../services/aircraft_service";
import type { AircraftStatus, AircraftType } from "../types/aircraft_types";

const fields = [
    "registration",
    "aircraft_type_UUID",
    "aircraft_status_UUID",
    "current_hours",
] as const;
type FieldErrors = Partial<Record<(typeof fields)[number], string>>;
const input_style = `${INVENTORY_FORM_INPUT} aria-invalid:focus-visible:outline-red-500`;

export default function AircraftCreateDialog({
    types,
    statuses,
    on_close,
}: {
    types: AircraftType[];
    statuses: AircraftStatus[];
    on_close: () => void;
}) {
    const navigate = useNavigate();
    const pending = useRef(false);
    const [saving, set_saving] = useState(false);
    const [error, set_error] = useState("");
    const [field_errors, set_field_errors] = useState<FieldErrors>({});
    const has_options = types.length > 0 && statuses.length > 0;

    async function save(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (pending.current || !has_options) return;

        const form = event.currentTarget;
        const data = new FormData(form);
        const registration = String(data.get("registration") ?? "")
            .trim()
            .toUpperCase();
        const aircraft_type_UUID = String(data.get("aircraft_type_UUID") ?? "");
        const aircraft_status_UUID = String(
            data.get("aircraft_status_UUID") ?? "",
        );
        const hours = String(data.get("current_hours") ?? "");
        const amount = Number(hours);
        const hours_input = form.elements.namedItem("current_hours");
        const next_errors: FieldErrors = {};
        if (registration.length < 2) {
            next_errors.registration =
                "Enter a registration with at least 2 characters.";
        } else if (registration.length > 12) {
            next_errors.registration =
                "Registration must be at most 12 characters.";
        } else if (!/^[A-Z0-9-]+$/.test(registration)) {
            next_errors.registration =
                "Use only letters, numbers, and hyphens.";
        }
        if (
            !types.some(
                (type) => type.aircraft_type_UUID === aircraft_type_UUID,
            )
        ) {
            next_errors.aircraft_type_UUID = "Select an aircraft type.";
        }
        if (
            !statuses.some(
                (status) =>
                    status.aircraft_status_UUID === aircraft_status_UUID,
            )
        ) {
            next_errors.aircraft_status_UUID = "Select an aircraft status.";
        }
        if (
            hours_input instanceof HTMLInputElement &&
            hours_input.validity.badInput
        ) {
            next_errors.current_hours =
                "Enter a number for current aircraft hours.";
        } else if (amount < 0 || amount > 99_999_999.99) {
            next_errors.current_hours =
                "Enter hours between 0 and 99,999,999.99.";
        } else if (Math.abs(amount * 100 - Math.round(amount * 100)) >= 1e-6) {
            next_errors.current_hours =
                "Enter hours with at most two decimal places.";
        }
        set_field_errors(next_errors);
        set_error("");
        const first_error = fields.find((field) => next_errors[field]);
        if (first_error) {
            const input = form.elements.namedItem(first_error);
            if (input instanceof HTMLElement) input.focus();
            return;
        }

        pending.current = true;
        set_saving(true);
        try {
            const aircraft = await aircraft_service.create({
                registration,
                aircraft_type_UUID,
                aircraft_status_UUID,
                ...(hours !== "" ? { current_hours: amount } : {}),
            });
            toast.success("Aircraft added", { position: "bottom-right" });
            on_close();
            void navigate(`/aircraft/${encodeURIComponent(aircraft.id)}`);
        } catch (cause) {
            set_error(
                cause instanceof Error
                    ? cause.message
                    : "Could not add aircraft. Your entries are kept.",
            );
        } finally {
            pending.current = false;
            set_saving(false);
        }
    }

    return (
        <FormDialog
            title="Add aircraft"
            compact
            is_busy={saving}
            on_close={on_close}
        >
            <form
                noValidate
                onSubmit={save}
                onChange={(event) => {
                    const target = event.target;
                    if (!(
                        target instanceof HTMLInputElement ||
                        target instanceof HTMLSelectElement
                    ))
                        return;
                    const field = fields.find((key) => key === target.name);
                    if (field && field_errors[field]) {
                        set_field_errors((current) => ({
                            ...current,
                            [field]: undefined,
                        }));
                    }
                }}
            >
                <div className="space-y-4 p-4 sm:px-5">
                    <p className="text-xs text-slate-600">
                        <span className="text-red-700">*</span> indicates a
                        required field.
                    </p>
                    {!has_options && (
                        <p role="status" className="text-sm text-slate-600">
                            Aircraft types and statuses are required before you
                            can add an aircraft.
                        </p>
                    )}
                    {error && (
                        <p
                            role="alert"
                            className="rounded-md bg-red-50 p-3 text-sm text-red-800"
                        >
                            {error}
                        </p>
                    )}
                    <fieldset
                        disabled={saving}
                        className="grid min-w-0 gap-3 sm:grid-cols-2"
                    >
                        <legend className="sr-only">Aircraft details</legend>
                        <FormField
                            label="Registration / Tail No."
                            required
                            error={field_errors.registration}
                        >
                            {(props) => (
                                <input
                                    {...props}
                                    name="registration"
                                    required
                                    className={input_style}
                                />
                            )}
                        </FormField>
                        <FormField
                            label="Aircraft type"
                            required
                            error={field_errors.aircraft_type_UUID}
                        >
                            {(props) => (
                                <select
                                    {...props}
                                    name="aircraft_type_UUID"
                                    required
                                    defaultValue=""
                                    className={input_style}
                                >
                                    <option value="" disabled>
                                        Select aircraft type
                                    </option>
                                    {types.map((type) => (
                                        <option
                                            key={type.aircraft_type_UUID}
                                            value={type.aircraft_type_UUID}
                                        >
                                            {type.type_name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </FormField>
                        <FormField
                            label="Status"
                            required
                            error={field_errors.aircraft_status_UUID}
                        >
                            {(props) => (
                                <select
                                    {...props}
                                    name="aircraft_status_UUID"
                                    required
                                    defaultValue=""
                                    className={input_style}
                                >
                                    <option value="" disabled>
                                        Select status
                                    </option>
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
                        <FormField
                            label="Current aircraft hours"
                            hint="Defaults to 0 if left blank."
                            error={field_errors.current_hours}
                        >
                            {(props) => (
                                <input
                                    {...props}
                                    name="current_hours"
                                    type="number"
                                    min={0}
                                    max={99999999.99}
                                    step="0.01"
                                    className={input_style}
                                />
                            )}
                        </FormField>
                    </fieldset>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 p-4 sm:px-5">
                    <Button
                        variant="secondary"
                        className="mr-auto"
                        disabled={saving}
                        onClick={on_close}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        is_loading={saving}
                        disabled={!has_options}
                        className="bg-[#152e45]! hover:bg-[#203f59]!"
                    >
                        Save aircraft
                    </Button>
                </div>
            </form>
        </FormDialog>
    );
}
