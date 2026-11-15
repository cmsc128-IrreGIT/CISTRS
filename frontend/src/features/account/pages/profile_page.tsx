import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/hooks/auth_context";
import type { SessionUser } from "../../auth/hooks/auth_context";
import { list_personnel } from "../../personnel/services/personnel_service";
import type { PersonnelRecord } from "../../personnel/types/personnel_types";
import FormField from "../../../shared/components/forms/form_field";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import FormDialog from "../../../shared/components/ui/form_dialog";
import StatusBadge from "../../../shared/components/ui/status_badge";
import { workspace_label } from "../../../shared/components/navigation/workspace";

export default function ProfilePage() {
    const { user } = useAuth();
    return user && <Profile key={user.account_UUID} user={user} />;
}

function Profile({ user }: { user: SessionUser }) {
    const [record, set_record] = useState<PersonnelRecord>();
    const [correcting, set_correcting] = useState(false);
    const [draft, set_draft] = useState("");
    const [copy_status, set_copy_status] = useState("");
    const can_read_personnel = user.features.includes("Personnel");

    useEffect(() => {
        if (!can_read_personnel) return;
        const controller = new AbortController();
        void list_personnel(controller.signal).then((people) => {
            if (!controller.signal.aborted) set_record(people.find(({ id }) => id === user.emp_UUID));
        }).catch(() => {
            // The authenticated account fields remain available if the directory is unreachable.
        });
        return () => controller.abort();
    }, [can_read_personnel, user.emp_UUID]);

    const name = record?.name || user.username;
    const initials = name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    const sections = [
        { title: "Account", entries: [
            { label: "Username", value: user.username },
            { label: "Work email", value: record?.email || "Not available" },
            { label: "Account status", value: <StatusBadge tone="success">Active</StatusBadge> },
        ] },
        { title: "Work information", entries: [
            { label: "Position", value: user.position?.position_name || record?.position || "Not recorded" },
            { label: "Department", value: record?.department || "Not available" },
            { label: "Assigned duties", value: user.roles?.join(" & ") || workspace_label(user) || "Not recorded" },
        ] },
    ];

    async function copy_request() {
        const correction = draft.trim();
        if (!correction) return;
        try {
            await navigator.clipboard.writeText(`Profile correction request for ${name} (${user.username})\n\n${correction}`);
            set_copy_status("Request copied. Share it with your administrator.");
        } catch {
            set_copy_status("Clipboard unavailable. Select and copy the details to share with your administrator.");
        }
    }

    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <WorkspaceBreadcrumbs current="My profile" />
            <h1 id="page_title" className="sr-only">My profile</h1>
            <Card>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-[#0b2238]">{initials}</span>
                        <h2 className="wrap-anywhere text-lg font-semibold text-[#0b2238]">{name}</h2>
                    </div>
                    <Button variant="secondary" onClick={() => { set_copy_status(""); set_correcting(true); }}>
                        <Pencil size={16} aria-hidden="true" /> Request correction
                    </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    {sections.map(({ title, entries }) => (
                        <section key={title} className="min-w-0 rounded-lg bg-slate-100 p-4">
                            <h3 className="mb-3 font-semibold text-[#0b2238]">{title}</h3>
                            <dl className="space-y-3">
                                {entries.map(({ label, value }) => (
                                    <div key={label}>
                                        <dt className="text-sm text-slate-600">{label}</dt>
                                        <dd className="mt-1 wrap-anywhere font-medium text-slate-900">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    ))}
                </div>
            </Card>
            {correcting && (
                <FormDialog title="Request profile correction" compact on_close={() => set_correcting(false)}>
                    <div className="space-y-3 p-4 sm:px-5">
                        <p className="text-sm text-slate-600">Describe the correction and share it with your administrator.</p>
                        <FormField label="Correction details">
                            {(props) => <textarea {...props} rows={3} maxLength={1000} value={draft} placeholder="Enter the details to update"
                                onChange={(event) => { set_draft(event.currentTarget.value); set_copy_status(""); }}
                                className="w-full resize-y rounded-lg border border-slate-300 p-3 text-sm" />}
                        </FormField>
                        {copy_status && <p role="status" className="text-sm text-slate-600">{copy_status}</p>}
                    </div>
                    <div className="flex justify-end gap-2 border-t border-slate-200 p-4 sm:px-5">
                        <Button variant="secondary" onClick={() => set_correcting(false)}>Close</Button>
                        <Button disabled={!draft.trim()} onClick={() => void copy_request()}>Copy request</Button>
                    </div>
                </FormDialog>
            )}
        </section>
    );
}

