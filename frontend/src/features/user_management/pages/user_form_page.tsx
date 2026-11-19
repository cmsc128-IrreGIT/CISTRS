import { useEffect, useRef, useState } from "react";
import type { SubmitEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import FormField from "../../../shared/components/forms/form_field";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import Button from "../../../shared/components/ui/button";
import FormDialog from "../../../shared/components/ui/form_dialog";
import { useAuth } from "../../auth/hooks/auth_context";
import { list_personnel, list_staff_directory } from "../../personnel/services/personnel_service";
import type { PersonnelRecord } from "../../personnel/types/personnel_types";
import { account_action_style, account_field_style } from "../config/user_management_config";
import useUserManagement from "../hooks/use_user_management";
import { create_account } from "../services/user_account_service";

const form_body = "space-y-4 px-4 py-4 sm:px-5";
const form_footer = "flex flex-wrap justify-end gap-2 border-t border-slate-200 px-4 py-3 sm:px-5";

export default function UserFormPage() {
    const { user_id } = useParams();
    const workspace = useUserManagement();
    const navigate = useNavigate();

    if (!user_id) return <CreateAccountDialog on_close={() => void navigate("/users", { replace: true })} />;
    const account = workspace.accounts.find(({ account_UUID }) => account_UUID === user_id);
    const account_path = `/users/${encodeURIComponent(user_id)}`;
    return <Navigate to={account ? account_path : "/users"} replace />;
}

function CreateAccountDialog({ on_close }: { on_close: () => void }) {
    const { user } = useAuth();
    const workspace = useUserManagement();
    const can_read_personnel = Boolean(user?.features.includes("Personnel"));
    const [people, set_people] = useState<PersonnelRecord[]>();
    const [load_error, set_load_error] = useState("");
    const [attempt, set_attempt] = useState(0);
    const [selected, set_selected] = useState("");
    const [error, set_error] = useState("");
    const [pending, set_pending] = useState(false);
    const saving = useRef(false);

    useEffect(() => {
        const controller = new AbortController();
        void (can_read_personnel ? list_personnel : list_staff_directory)(controller.signal).then((rows) => {
            if (!controller.signal.aborted) set_people(rows);
        }).catch((cause: unknown) => {
            if (!controller.signal.aborted) set_load_error(cause instanceof Error ? cause.message : "Unable to load personnel.");
        });
        return () => controller.abort();
    }, [attempt, can_read_personnel]);

    const linked_ids = new Set(workspace.accounts.map(({ employee }) => employee.emp_UUID));
    const eligible = people?.filter((person) => (!can_read_personnel || person.record_status === "Active") && !linked_ids.has(person.id));
    const person = eligible?.find(({ id }) => id === selected);

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!person || saving.current) return;
        const data = new FormData(event.currentTarget);
        const username = String(data.get("username") ?? "").trim().toLowerCase();
        const password = String(data.get("password") ?? "");
        if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
            set_error("Use 3–50 letters, numbers, periods, underscores, or hyphens for the username.");
            return;
        }
        if (password.length < 8 || new TextEncoder().encode(password).length > 72 ||
            !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
            set_error("Use at least 8 characters and at most 72 bytes, with a letter and a number.");
            return;
        }
        saving.current = true;
        set_pending(true);
        set_error("");
        try {
            await create_account({ emp_UUID: person.id, username, password });
            toast.success("Account created", { position: "bottom-right" });
            workspace.reload();
            on_close();
        } catch (cause) {
            set_error(cause instanceof Error ? cause.message : "Unable to create the account.");
        } finally {
            saving.current = false;
            set_pending(false);
        }
    }

    return (
        <FormDialog title="Create user account" compact is_busy={pending} on_close={on_close}>
            <form onSubmit={submit}>
                <div className={form_body}>
                    {load_error ? (
                            <>
                                <p role="alert" className="text-sm text-red-700">{load_error}</p>
                                <Button variant="secondary" onClick={() => { set_load_error(""); set_attempt((value) => value + 1); }}>Retry</Button>
                            </>
                        ) : !eligible ? <ScreenLoading compact label="Loading personnel…" />
                        : !eligible.length ? <p role="status" className="text-sm text-slate-600">No active personnel without an account are available.</p>
                        : (
                            <>
                                <p className="text-xs text-slate-600"><span className="text-red-700">*</span> indicates a required field.</p>
                                <fieldset disabled={pending} className="grid min-w-0 gap-3 sm:grid-cols-2">
                                    <FormField label="Linked personnel" required>
                                        {(props) => <select {...props} required value={selected} className={account_field_style}
                                            onChange={(event) => set_selected(event.currentTarget.value)}>
                                            <option value="">Select personnel</option>
                                            {eligible.map(({ id, name, employee_number }) =>
                                                <option key={id} value={id}>{name} · {employee_number}</option>)}
                                        </select>}
                                    </FormField>
                                    <FormField label="Username" required>
                                        {(props) => <input {...props} name="username" required minLength={3} maxLength={50}
                                            placeholder="e.g. first.last" autoCapitalize="none" autoComplete="off" className={account_field_style} />}
                                    </FormField>
                                    <FormField label="Temporary password" required hint="Use a letter and a number.">
                                        {(props) => <input {...props} name="password" required type="password" minLength={8} maxLength={72}
                                            placeholder="Enter temporary password" autoComplete="new-password" className={account_field_style} />}
                                    </FormField>
                                    <FormField label="Account status">
                                        {(props) => <input {...props} readOnly value="Active" className={account_field_style} />}
                                    </FormField>
                                </fieldset>
                                <div className="rounded-lg bg-slate-100 p-3 text-sm">
                                    <p className="font-semibold text-[#0b2238]">Assigned access</p>
                                    <p className="mt-1 text-slate-600">{person?.position || "Select a person to see their position."}</p>
                                    {person && <p className="mt-1 text-slate-600">The account inherits access from the linked employee’s position.</p>}
                                </div>
                            </>
                        )}
                    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                </div>
                <div className={form_footer}>
                    <Button type="button" variant="secondary" disabled={pending} onClick={on_close}>Cancel</Button>
                    <Button type="submit" disabled={pending || !person} className={account_action_style}>{pending ? "Creating…" : "Create account"}</Button>
                </div>
            </form>
        </FormDialog>
    );
}
