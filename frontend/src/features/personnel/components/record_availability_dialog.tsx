import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { SubmitEvent } from "react";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import FormDialog from "../../../shared/components/ui/form_dialog";
import { availability_statuses } from "../types/availability_types";
import type { AvailabilityValues } from "../types/availability_types";
import type { PreviewRecord } from "../../../shared/types/record_types";

const field_style =
    "min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8]";
const select_icon_style =
    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600";

export default function RecordAvailabilityDialog({
    date,
    people,
    records,
    on_close,
    on_save,
}: {
    date: string;
    people: { id: string; name: string }[];
    records: PreviewRecord[];
    on_close: () => void;
    on_save: (values: AvailabilityValues) => void;
}) {
    const [staff_id, set_staff_id] = useState("");
    const [selected_date, set_selected_date] = useState(date);
    const existing = records.find(
        (row) => row.personnel === staff_id && row.date === selected_date,
    );

    function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const person = people.find(({ id }) => id === staff_id);
        const status = availability_statuses.find(
            (option) => option === data.get("status"),
        );
        if (!person || !selected_date || !status) return;
        on_save({
            personnel: person.id,
            personnel_name: person.name,
            date: selected_date,
            status,
            notes: String(data.get("notes") ?? "").trim(),
        });
    }

    return (
        <FormDialog title="Record availability" compact on_close={on_close}>
            <form onSubmit={submit}>
                <div className="min-h-56 space-y-3 px-4 py-4 sm:px-5">
                    <p className="text-xs text-slate-600">
                        <span className="text-red-700">*</span> indicates a
                        required field.
                    </p>
                    <fieldset className="grid min-w-0 gap-3 sm:grid-cols-2">
                        <legend className="sr-only">Record availability</legend>
                        <FormField label="Personnel" required>
                            {(props) => (
                                <div className="relative">
                                    <select
                                        {...props}
                                        value={staff_id}
                                        onChange={(event) =>
                                            set_staff_id(
                                                event.currentTarget.value,
                                            )
                                        }
                                        className={`${field_style} appearance-none pr-9`}
                                    >
                                        <option value="" disabled hidden>
                                            Select personnel
                                        </option>
                                        {people.map(({ id, name }) => (
                                            <option key={id} value={id}>
                                                {name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown
                                        size={16}
                                        aria-hidden="true"
                                        className={select_icon_style}
                                    />
                                </div>
                            )}
                        </FormField>
                        <FormField label="Date" required>
                            {(props) => (
                                <input
                                    {...props}
                                    type="date"
                                    value={selected_date}
                                    onChange={(event) =>
                                        set_selected_date(
                                            event.currentTarget.value,
                                        )
                                    }
                                    className={field_style}
                                />
                            )}
                        </FormField>
                        <FormField label="Availability" required>
                            {(props) => (
                                <div className="relative">
                                    <select
                                        {...props}
                                        key={`status:${staff_id}:${selected_date}`}
                                        name="status"
                                        defaultValue={
                                            existing?.status ?? "Available"
                                        }
                                        className={`${field_style} appearance-none pr-9`}
                                    >
                                        {availability_statuses.map((status) => (
                                            <option key={status}>
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown
                                        size={16}
                                        aria-hidden="true"
                                        className={select_icon_style}
                                    />
                                </div>
                            )}
                        </FormField>
                        <FormField label="Notes">
                            {(props) => (
                                <input
                                    {...props}
                                    key={`notes:${staff_id}:${selected_date}`}
                                    name="notes"
                                    defaultValue={existing?.notes}
                                    placeholder="Optional"
                                    maxLength={500}
                                    className={field_style}
                                />
                            )}
                        </FormField>
                    </fieldset>
                </div>
                <div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 px-4 py-3 sm:px-5">
                    <Button variant="secondary" onClick={on_close}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="bg-[#0b2238]! hover:bg-[#193951]!"
                    >
                        Save availability
                    </Button>
                </div>
            </form>
        </FormDialog>
    );
}
