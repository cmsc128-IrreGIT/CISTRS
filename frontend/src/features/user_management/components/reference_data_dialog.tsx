import { useRef, useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { api } from "../../../shared/api/client";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import FormDialog from "../../../shared/components/ui/form_dialog";
import { account_field_style } from "../config/user_management_config";

const kinds = {
    "flight-types": { label: "Flight type", name: "type_name" },
    "flight-statuses": { label: "Flight status", name: "status_name" },
    "delay-categories": { label: "Delay category", name: "category_name" },
    "personnel-categories": {
        label: "Personnel category",
        name: "category_name",
    },
    locations: { label: "Inventory location", name: "location_name" },
    suppliers: { label: "Supplier", name: "organization_name" },
    manufacturers: { label: "Manufacturer", name: "organization_name" },
} as const;

export default function ReferenceDataDialog({
    on_close,
}: {
    on_close: () => void;
}) {
    const [kind, set_kind] = useState<keyof typeof kinds>("flight-types");
    const [error, set_error] = useState("");
    const [busy, set_busy] = useState(false);
    const pending = useRef(false);
    const organization = kind === "suppliers" || kind === "manufacturers";
    const secondary = organization
        ? {
              key: "organization_location",
              label: "Organization location",
              max: 150,
              required: true,
          }
        : kind === "locations"
          ? {
                key: "storage_area",
                label: "Storage area",
                max: 100,
                required: true,
            }
          : {
                key: "description",
                label: "Description",
                max: 500,
                required: false,
            };

    async function save(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (pending.current) return;
        const data = new FormData(event.currentTarget);
        const name = String(data.get("name") ?? "").trim();
        const extra = String(data.get("secondary") ?? "").trim();
        if (!name || (secondary.required && !extra)) {
            set_error("Fill in the required fields.");
            return;
        }
        pending.current = true;
        set_busy(true);
        set_error("");
        try {
            await api(`/admin/${kind}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    [kinds[kind].name]: name,
                    ...(extra ? { [secondary.key]: extra } : {}),
                }),
            });
            toast.success(`${kinds[kind].label} added`, {
                position: "bottom-right",
            });
            on_close();
        } catch (cause) {
            set_error(
                cause instanceof Error
                    ? cause.message
                    : "Could not add the entry.",
            );
        } finally {
            pending.current = false;
            set_busy(false);
        }
    }

    return (
        <FormDialog
            title="Add reference data"
            compact
            is_busy={busy}
            on_close={on_close}
        >
            <form onSubmit={save}>
                <fieldset disabled={busy} className="space-y-4 p-4 sm:px-5">
                    <legend className="sr-only">Reference data</legend>
                    <FormField label="Entry type">
                        {(props) => (
                            <select
                                {...props}
                                value={kind}
                                className={account_field_style}
                                onChange={(event) => {
                                    set_kind(
                                        event.currentTarget
                                            .value as keyof typeof kinds,
                                    );
                                    set_error("");
                                }}
                            >
                                {Object.entries(kinds).map(([key, item]) => (
                                    <option key={key} value={key}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        )}
                    </FormField>
                    {error && (
                        <p role="alert" className="text-sm text-red-700">
                            {error}
                        </p>
                    )}
                    <div key={kind} className="space-y-4">
                        <FormField
                            label={
                                organization
                                    ? "Organization name"
                                    : `${kinds[kind].label} name`
                            }
                            required
                        >
                            {(props) => (
                                <input
                                    {...props}
                                    name="name"
                                    maxLength={organization ? 150 : 100}
                                    className={account_field_style}
                                />
                            )}
                        </FormField>
                        <FormField
                            label={secondary.label}
                            required={secondary.required}
                        >
                            {(props) =>
                                secondary.required ? (
                                    <input
                                        {...props}
                                        name="secondary"
                                        maxLength={secondary.max}
                                        className={account_field_style}
                                    />
                                ) : (
                                    <textarea
                                        {...props}
                                        name="secondary"
                                        maxLength={secondary.max}
                                        className={account_field_style}
                                    />
                                )
                            }
                        </FormField>
                    </div>
                </fieldset>
                <div className="flex justify-end gap-2 border-t border-slate-200 p-4 sm:px-5">
                    <Button
                        variant="secondary"
                        className="mr-auto"
                        disabled={busy}
                        onClick={on_close}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        is_loading={busy}
                        className="bg-[#152e45]! hover:bg-[#203f59]!"
                    >
                        Save entry
                    </Button>
                </div>
            </form>
        </FormDialog>
    );
}
