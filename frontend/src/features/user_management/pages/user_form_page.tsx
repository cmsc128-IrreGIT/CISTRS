import { useEffect, useRef, useState } from "react";
import type { SubmitEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import FormField from "../../../shared/components/forms/form_field";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import Button from "../../../shared/components/ui/button";
import FormDialog from "../../../shared/components/ui/form_dialog";
import {
    account_action_style,
    account_field_style,
    account_statuses,
    preview_duties,
} from "../config/user_management_config";
import useUserManagement from "../hooks/use_user_management";
import {
    create_account,
    list_eligible_employees,
} from "../services/user_account_service";
import type { UserAccount } from "../types/user_account";
import { account_name } from "../types/user_account";

const form_body = "space-y-4 px-4 py-4 sm:px-5";
const form_footer =
    "flex flex-wrap justify-end gap-2 border-t border-slate-200 px-4 py-3 sm:px-5";

export default function UserFormPage() {
    const { user_id } = useParams();
    const workspace = useUserManagement();
    const navigate = useNavigate();

    if (!user_id)
        return (
            <CreateAccountDialog
                on_close={() => void navigate("/users", { replace: true })}
            />
        );
    const account = workspace.accounts.find(
        ({ account_UUID }) => account_UUID === user_id,
    );
    const account_path = `/users/${encodeURIComponent(user_id)}`;
    if (!account || user_id === workspace.owner)
        return <Navigate to={account_path} replace />;
    return (
        <EditAccessDialog
            key={user_id}
            account={account}
            on_close={() => void navigate(account_path, { replace: true })}
        />
    );
}

function CreateAccountDialog({ on_close }: { on_close: () => void }) {
    const workspace = useUserManagement();
    const [eligible, set_eligible] =
        useState<Awaited<ReturnType<typeof list_eligible_employees>>>();
    const [load_error, set_load_error] = useState("");
    const [attempt, set_attempt] = useState(0);
    const [selected, set_selected] = useState("");
    const [error, set_error] = useState("");
    const [pending, set_pending] = useState(false);
    const saving = useRef(false);

    useEffect(() => {
        const controller = new AbortController();
        void list_eligible_employees(controller.signal)
            .then((rows) => {
                if (!controller.signal.aborted) set_eligible(rows);
            })
            .catch((cause: unknown) => {
                if (!controller.signal.aborted)
                    set_load_error(
                        cause instanceof Error
                            ? cause.message
                            : "Unable to load personnel.",
                    );
            });
        return () => controller.abort();
    }, [attempt]);

    const person = eligible?.find(({ id }) => id === selected);

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!person || saving.current) return;
        const data = new FormData(event.currentTarget);
        const username = String(data.get("username") ?? "")
            .trim()
            .toLowerCase();
        const password = String(data.get("password") ?? "");
        if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
            set_error(
                "Use 3–50 letters, numbers, periods, underscores, or hyphens for the username.",
            );
            return;
        }
        if (
            password.length < 8 ||
            new TextEncoder().encode(password).length > 72 ||
            !/[A-Za-z]/.test(password) ||
            !/[0-9]/.test(password)
        ) {
            set_error(
                "Use at least 8 characters and at most 72 bytes, with a letter and a number.",
            );
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
            set_error(
                cause instanceof Error
                    ? cause.message
                    : "Unable to create the account.",
            );
        } finally {
            saving.current = false;
            set_pending(false);
        }
    }

    return (
        <FormDialog
            title="Create user account"
            compact
            is_busy={pending}
            on_close={on_close}
        >
            <form onSubmit={submit}>
                <div className={form_body}>
                    {load_error ? (
                        <>
                            <p role="alert" className="text-sm text-red-700">
                                {load_error}
                            </p>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    set_load_error("");
                                    set_attempt((value) => value + 1);
                                }}
                            >
                                Retry
                            </Button>
                        </>
                    ) : !eligible ? (
                        <ScreenLoading compact label="Loading personnel…" />
                    ) : !eligible.length ? (
                        <p role="status" className="text-sm text-slate-600">
                            No active employees without an account are
                            available. A new hire needs an active personnel
                            record before an account can be created.
                        </p>
                    ) : (
                        <>
                            <p className="text-xs text-slate-600">
                                <span className="text-red-700">*</span>{" "}
                                indicates a required field.
                            </p>
                            <fieldset
                                disabled={pending}
                                className="grid min-w-0 gap-3 sm:grid-cols-2"
                            >
                                <FormField label="Existing employee" required>
                                    {(props) => (
                                        <select
                                            {...props}
                                            value={selected}
                                            className={account_field_style}
                                            onChange={(event) =>
                                                set_selected(
                                                    event.currentTarget.value,
                                                )
                                            }
                                        >
                                            <option value="">
                                                Select personnel
                                            </option>
                                            {eligible.map(
                                                ({
                                                    id,
                                                    name,
                                                    employee_number,
                                                }) => (
                                                    <option key={id} value={id}>
                                                        {name} ·{" "}
                                                        {employee_number}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    )}
                                </FormField>
                                <FormField label="Username" required>
                                    {(props) => (
                                        <input
                                            {...props}
                                            name="username"
                                            minLength={3}
                                            maxLength={50}
                                            placeholder="e.g. first.last"
                                            autoCapitalize="none"
                                            autoComplete="off"
                                            className={account_field_style}
                                        />
                                    )}
                                </FormField>
                                <FormField
                                    label="Temporary password"
                                    required
                                    hint="Use a letter and a number."
                                >
                                    {(props) => (
                                        <input
                                            {...props}
                                            name="password"
                                            type="password"
                                            minLength={8}
                                            maxLength={72}
                                            placeholder="Enter temporary password"
                                            autoComplete="new-password"
                                            className={account_field_style}
                                        />
                                    )}
                                </FormField>
                                <FormField label="Account status">
                                    {(props) => (
                                        <input
                                            {...props}
                                            readOnly
                                            value="Active"
                                            className={account_field_style}
                                        />
                                    )}
                                </FormField>
                            </fieldset>
                            <div className="rounded-lg bg-slate-100 p-3 text-sm">
                                <p className="font-semibold text-[#0b2238]">
                                    Assigned access
                                </p>
                                <p className="mt-1 text-slate-600">
                                    {person?.position ||
                                        "Select a person to see their position."}
                                </p>
                                {person && (
                                    <p className="mt-1 text-slate-600">
                                        Workspace access is assigned by the
                                        employee’s position.
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                    {error && (
                        <p role="alert" className="text-sm text-red-700">
                            {error}
                        </p>
                    )}
                </div>
                <div className={form_footer}>
                    <Button
                        variant="secondary"
                        className="mr-auto"
                        disabled={pending}
                        onClick={on_close}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={pending || !person}
                        className={account_action_style}
                    >
                        {pending ? "Creating…" : "Create account"}
                    </Button>
                </div>
            </form>
        </FormDialog>
    );
}

function EditAccessDialog({
    account,
    on_close,
}: {
    account: UserAccount;
    on_close: () => void;
}) {
    const workspace = useUserManagement();
    const preview = workspace.previews?.get(account.account_UUID);
    const status = preview?.status ?? account.account_status;
    const statuses =
        account_statuses.includes(status) || !status
            ? account_statuses
            : [status, ...account_statuses];

    function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const next_status = statuses.find(
            (value) => value === data.get("status"),
        );
        if (!next_status) return;
        workspace.save_preview(account.account_UUID, {
            status: next_status,
            duties: preview_duties.filter((duty) =>
                data.getAll("duties").includes(duty),
            ),
        });
        toast.success("Access preview saved", { position: "bottom-right" });
        on_close();
    }

    return (
        <FormDialog title="Edit account access" compact on_close={on_close}>
            <form onSubmit={submit}>
                <div className={form_body}>
                    <p className="text-sm font-semibold">
                        {account_name(account)} · {account.employee.emp_number}
                    </p>
                    <p className="rounded-lg bg-blue-50 p-3 text-sm text-slate-700">
                        Preview changes for this browser session. Live
                        permissions follow the employee’s position.
                    </p>
                    <FormField label="Account status" required>
                        {(props) => (
                            <select
                                {...props}
                                name="status"
                                defaultValue={status || "Active"}
                                className={account_field_style}
                            >
                                {statuses.map((value) => (
                                    <option key={value}>{value}</option>
                                ))}
                            </select>
                        )}
                    </FormField>
                    <fieldset className="space-y-2 text-sm">
                        <legend className="mb-2 font-semibold text-[#0b2238]">
                            Assigned duties preview
                        </legend>
                        {preview_duties.map((duty) => (
                            <label
                                key={duty}
                                className="flex min-h-10 items-center gap-3 rounded-md bg-slate-100 px-3"
                            >
                                <input
                                    type="checkbox"
                                    name="duties"
                                    value={duty}
                                    defaultChecked={preview?.duties.includes(
                                        duty,
                                    )}
                                />
                                {duty}
                            </label>
                        ))}
                    </fieldset>
                </div>
                <div className={form_footer}>
                    <Button
                        variant="secondary"
                        className="mr-auto"
                        onClick={on_close}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" className={account_action_style}>
                        Save preview
                    </Button>
                </div>
            </form>
        </FormDialog>
    );
}
