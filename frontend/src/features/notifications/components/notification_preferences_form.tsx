import { useState } from "react";
import type { SubmitEvent } from "react";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import DataTable from "../../../shared/components/ui/data_table";
import { alert_types, delivery_channels } from "../config/notification_preferences";
import type { AlertType, DeliveryChannel, NotificationPreferences } from "../config/notification_preferences";

const contact_style = "min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm aria-invalid:border-red-500 focus-visible:outline-2 focus-visible:outline-[#1d4ed8]";

export default function NotificationPreferencesForm({ initial, on_save, on_cancel }: {
    initial: NotificationPreferences;
    on_save: (preferences: NotificationPreferences) => void;
    on_cancel?: () => void;
}) {
    const [draft, set_draft] = useState(initial);
    const [errors, set_errors] = useState<{ email?: string; mobile?: string }>({});

    function toggle(alert: AlertType, channel: DeliveryChannel) {
        set_draft((current) => ({
            ...current,
            alerts: {
                ...current.alerts,
                [alert]: { ...current.alerts[alert], [channel]: !current.alerts[alert][channel] },
            },
        }));
    }

    function save(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const email = draft.email.trim();
        const mobile = draft.mobile.trim();
        const preferences = Object.values(draft.alerts);
        const needs_email = preferences.some((alert) => alert.email);
        const needs_mobile = preferences.some((alert) => alert.sms);
        const mobile_number = mobile.replace(/[ ()-]/g, "");
        const next_errors = {
            email: (email || needs_email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                ? "Enter a valid work email." : undefined,
            mobile: (mobile || needs_mobile) && !/^\+?\d{7,15}$/.test(mobile_number)
                ? "Enter a valid mobile number." : undefined,
        };
        set_errors(next_errors);
        if (!next_errors.email && !next_errors.mobile) on_save({ ...draft, email, mobile });
    }

    return (
        <form noValidate onSubmit={save} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">Choose how you would receive each type of alert.</p>
                <div className="flex flex-wrap gap-2">
                    {on_cancel && <Button variant="secondary" onClick={on_cancel}>Cancel</Button>}
                    <Button type="submit" className="bg-[#0b2238]! hover:bg-[#193951]!">Save preferences</Button>
                </div>
            </div>
            <h2 className="font-semibold text-[#0b2238]">Delivery channels</h2>
            <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Work email" error={errors.email}>
                    {(props) => <input {...props} type="email" autoComplete="email" maxLength={254} value={draft.email}
                        placeholder="Enter work email" className={contact_style} onChange={(event) => set_draft({ ...draft, email: event.currentTarget.value })} />}
                </FormField>
                <FormField label="Mobile number" error={errors.mobile}>
                    {(props) => <input {...props} type="tel" autoComplete="tel" maxLength={32} value={draft.mobile}
                        placeholder="Add a number to enable SMS" className={contact_style} onChange={(event) => set_draft({ ...draft, mobile: event.currentTarget.value })} />}
                </FormField>
            </div>
            <DataTable inventory caption="Delivery channels by alert type" rows={[...alert_types]} get_row_key={({ key }) => key}
                columns={[
                    { id: "alert", header: "Alert type", render: ({ label }) => <span className="font-medium">{label}</span> },
                    ...delivery_channels.map((channel) => ({
                        id: channel.key, header: channel.label,
                        render: (alert: (typeof alert_types)[number]) => {
                            const checked = draft.alerts[alert.key][channel.key];
                            return (
                                <button type="button" role="switch" aria-checked={checked} aria-label={`${channel.label} for ${alert.label}`}
                                    onClick={() => toggle(alert.key, channel.key)}
                                    className="inline-flex min-h-10 items-center gap-2 rounded-sm text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8]">
                                    <span aria-hidden="true" className={`inline-flex h-5 w-9 items-center rounded-full px-0.5 ${checked ? "justify-end bg-[#0b2238]" : "justify-start bg-slate-400"}`}>
                                        <span className="size-4 rounded-full bg-white" />
                                    </span>
                                    {checked ? "On" : "Off"}
                                </button>
                            );
                        },
                    })),
                ]} />
            <p className="text-xs text-slate-600">Read status applies to the inbox. Email and SMS delivery have separate statuses.</p>
        </form>
    );
}
