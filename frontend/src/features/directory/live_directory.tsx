import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { api, ApiError } from "../../shared/api/client";
import { useAuth } from "../auth/hooks/auth_context";
import SearchInput from "../../shared/components/forms/search_input";
import PageHeader from "../../shared/components/ui/page_header";
import Card from "../../shared/components/ui/card";
import DataTable from "../../shared/components/ui/data_table";
import ScreenLoading from "../../shared/components/feedback/screen_loading";
import FormDialog from "../../shared/components/ui/form_dialog";
import { button_styles } from "../../shared/styles/button_styles";

type Role = { role_UUID: string; role_name: string };
type Employee = {
    emp_UUID: string;
    emp_number: string;
    f_name: string;
    l_name: string;
    position: string;
    personnel_category: string;
    record_status: string;
    base: { base_name: string };
    employment_status: { status_name: string };
    contacts: { contact: { contact_type: string; contact_value: string } }[];
    licenses: {
        emp_license_UUID: string;
        license_number: string;
        expiry_date: string | null;
        license_type: { license_type_name: string };
    }[];
};
type Account = {
    account_UUID: string;
    username: string;
    account_status: string;
    last_login_at: string | null;
    employee: { emp_number: string; f_name: string; l_name: string };
    roles: Role[];
};
const field =
    "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm";
export default function LiveDirectory({
    kind,
    detail = false,
    form = false,
}: {
    kind: "users" | "personnel";
    detail?: boolean;
    form?: boolean;
}) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const params = useParams();
    const id = params.user_id || params.personnel_id;
    const [accounts, set_accounts] = useState<Account[]>([]);
    const [employees, set_employees] = useState<Employee[]>([]);
    const [roles, set_roles] = useState<Role[]>([]);
    const [loading, set_loading] = useState(true);
    const [error, set_error] = useState("");
    const [denied, set_denied] = useState(false);
    const [version, set_version] = useState(0);
    const [search, set_search] = useState("");
    const [page, set_page] = useState(1);
    const [pending, set_pending] = useState(false);
    const [save_error, set_save_error] = useState("");
    const saving = useRef(false);
    const feature = kind === "users" ? "User Accounts" : "Personnel";
    const allowed = !!user?.features.includes(feature);
    useEffect(() => {
        if (!allowed) return;
        const controller = new AbortController();
        async function load() {
            try {
                if (kind === "users") {
                    const data = await api<Account[]>("/users", {
                        signal: controller.signal,
                    });
                    if (!controller.signal.aborted) set_accounts(data);
                    if (form) {
                        const role_data = await api<Role[]>("/users/roles", {
                            signal: controller.signal,
                        });
                        if (!controller.signal.aborted) set_roles(role_data);
                        if (!id) {
                            const staff = await api<Employee[]>(
                                "/personnel/employees",
                                { signal: controller.signal },
                            );
                            if (!controller.signal.aborted)
                                set_employees(staff);
                        }
                    }
                } else {
                    const data = await api<Employee[]>("/personnel/employees", {
                        signal: controller.signal,
                    });
                    if (!controller.signal.aborted) set_employees(data);
                }
            } catch (error) {
                if (controller.signal.aborted) return;
                if (error instanceof ApiError && error.status === 403)
                    set_denied(true);
                else
                    set_error(
                        error instanceof Error
                            ? error.message
                            : "Unable to load records.",
                    );
            } finally {
                if (!controller.signal.aborted) set_loading(false);
            }
        }
        void load();
        return () => controller.abort();
    }, [allowed, kind, form, id, version]);
    if (!allowed || denied) return <Navigate to="/403" replace />;
    if (loading) return <ScreenLoading label={`Loading ${kind}…`} />;
    const retry = () => {
        set_error("");
        set_loading(true);
        set_version((value) => value + 1);
    };
    if (error)
        return (
            <Card>
                <p role="alert" className="text-sm text-red-700">
                    {error}
                </p>
                <button
                    type="button"
                    className={button_styles("secondary")}
                    onClick={retry}
                >
                    Retry
                </button>
            </Card>
        );
    const eligible_employees = employees.filter(
        (row) =>
            row.record_status === "Active" &&
            !accounts.some(
                (account) => account.employee.emp_number === row.emp_number,
            ),
    );
    const account = accounts.find((row) => row.account_UUID === id);
    const employee = employees.find((row) => row.emp_UUID === id);
    if ((detail || (form && id)) && !(kind === "users" ? account : employee))
        return (
            <Card>
                <p>Record not found.</p>
                <Link to={`/${kind}`}>Return to {kind}</Link>
            </Card>
        );
    const rows =
        kind === "users"
            ? accounts.map((row) => ({
                  id: row.account_UUID,
                  name: `${row.employee.f_name} ${row.employee.l_name}`,
                  reference: row.username,
                  description: row.roles
                      .map((role) => role.role_name)
                      .join(", "),
                  status: row.account_status,
              }))
            : employees.map((row) => ({
                  id: row.emp_UUID,
                  name: `${row.f_name} ${row.l_name}`,
                  reference: row.emp_number,
                  description: row.position,
                  status: row.record_status,
              }));
    const filtered = rows.filter((row) =>
        [row.name, row.reference, row.description, row.status].some((value) =>
            value.toLowerCase().includes(search.trim().toLowerCase()),
        ),
    );
    const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / 5)));
    const list = (
        <section className="space-y-5">
            <PageHeader
                title_id="page_title"
                title={kind === "users" ? "Users" : "Personnel"}
                description={
                    kind === "users"
                        ? "Account records and assigned roles."
                        : "Employee records and qualifications."
                }
                actions={
                    kind === "users" ? (
                        <Link to="/users/new" className={button_styles()}>
                            Add User
                        </Link>
                    ) : undefined
                }
            />
            <Card>
                <div className="max-w-md">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                        Search {kind}
                    </p>
                    <SearchInput
                        value={search}
                        on_change={(value) => {
                            set_search(value);
                            set_page(1);
                        }}
                        label={`Search ${kind}`}
                        placeholder={
                            kind === "users"
                                ? "Name, username, role, or status"
                                : "Name, employee number, position, or status"
                        }
                    />
                </div>
                <p role="status" className="my-3 text-sm text-slate-500">
                    {filtered.length} matching records
                </p>
                <DataTable
                    bounded
                    caption={`${kind} records`}
                    rows={filtered.slice((current - 1) * 5, current * 5)}
                    get_row_key={(row) => row.id}
                    columns={[
                        {
                            id: "name",
                            header: "Name",
                            render: (row) => (
                                <Link
                                    className="font-medium text-blue-700 underline"
                                    to={`/${kind}/${row.id}`}
                                >
                                    {row.name}
                                </Link>
                            ),
                        },
                        {
                            id: "reference",
                            header:
                                kind === "users"
                                    ? "Username"
                                    : "Employee number",
                            render: (row) => row.reference,
                        },
                        {
                            id: "description",
                            header: kind === "users" ? "Roles" : "Position",
                            render: (row) => row.description,
                        },
                        {
                            id: "status",
                            header: "Status",
                            render: (row) => row.status,
                        },
                    ]}
                    empty_title="No matching records"
                />
                <div className="mt-3 flex items-center justify-end gap-3 text-sm">
                    <button
                        className={button_styles("secondary")}
                        disabled={current === 1}
                        onClick={() => set_page(current - 1)}
                    >
                        Previous
                    </button>
                    <span>
                        Page {current} of{" "}
                        {Math.max(1, Math.ceil(filtered.length / 5))}
                    </span>
                    <button
                        className={button_styles("secondary")}
                        disabled={current * 5 >= filtered.length}
                        onClick={() => set_page(current + 1)}
                    >
                        Next
                    </button>
                </div>
            </Card>
        </section>
    );
    if (form && kind === "users")
        return (
            <>
                {list}
                <FormDialog
                    title={id ? "Edit account roles" : "Add User"}
                    on_close={() => {
                        if (!saving.current) navigate("/users");
                    }}
                >
                    <form
                        key={id || "new"}
                        className="space-y-4"
                        aria-busy={pending}
                        onSubmit={async (event) => {
                            event.preventDefault();
                            if (saving.current) return;
                            const data = new FormData(event.currentTarget);
                            const role_UUIDs = data.getAll("roles").map(String);
                            if (!role_UUIDs.length) {
                                set_save_error("Assign at least one role.");
                                return;
                            }
                            saving.current = true;
                            set_pending(true);
                            set_save_error("");
                            try {
                                await api(
                                    id
                                        ? `/users/${encodeURIComponent(id)}/roles`
                                        : "/users",
                                    {
                                        method: id ? "PUT" : "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify(
                                            id
                                                ? { role_UUIDs }
                                                : {
                                                      emp_UUID:
                                                          data.get("employee"),
                                                      username: String(
                                                          data.get("username"),
                                                      )
                                                          .trim()
                                                          .toLowerCase(),
                                                      password:
                                                          data.get("password"),
                                                      role_UUIDs,
                                                  },
                                        ),
                                    },
                                );
                                toast.success(
                                    id
                                        ? "Account roles updated."
                                        : "Account created.",
                                );
                                navigate("/users", { replace: true });
                            } catch (error) {
                                set_save_error(
                                    error instanceof Error
                                        ? error.message
                                        : "Unable to save account.",
                                );
                            } finally {
                                saving.current = false;
                                set_pending(false);
                            }
                        }}
                    >
                        <fieldset
                            disabled={pending || id === user?.account_UUID}
                            className="space-y-4"
                        >
                            {account ? (
                                <p className="text-sm">{account.username}</p>
                            ) : (
                                <>
                                    {!eligible_employees.length && (
                                        <p
                                            role="status"
                                            className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600"
                                        >
                                            All active employees already have
                                            accounts, or no active employees are
                                            available. Contact your
                                            administrator to register a new
                                            employee first.
                                        </p>
                                    )}
                                    <label className="block text-sm">
                                        Employee{" "}
                                        <span className="text-red-600">*</span>
                                        <select
                                            name="employee"
                                            required
                                            className={field}
                                        >
                                            <option value="">
                                                Select employee
                                            </option>
                                            {eligible_employees.map((row) => (
                                                <option
                                                    key={row.emp_UUID}
                                                    value={row.emp_UUID}
                                                >
                                                    {row.emp_number} ·{" "}
                                                    {row.f_name} {row.l_name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="block text-sm">
                                        Username{" "}
                                        <span className="text-red-600">*</span>
                                        <input
                                            name="username"
                                            required
                                            minLength={3}
                                            maxLength={50}
                                            pattern="[a-z0-9._-]+"
                                            autoCapitalize="none"
                                            autoComplete="off"
                                            className={field}
                                        />
                                        <span className="text-xs text-slate-500">
                                            Use lowercase letters, numbers,
                                            periods, underscores, or hyphens.
                                        </span>
                                    </label>
                                    <label className="block text-sm">
                                        Temporary password{" "}
                                        <span className="text-red-600">*</span>
                                        <input
                                            name="password"
                                            type="password"
                                            required
                                            minLength={8}
                                            maxLength={72}
                                            pattern="(?=.*[A-Za-z])(?=.*[0-9]).+"
                                            autoComplete="new-password"
                                            className={field}
                                        />
                                        <span className="text-xs text-slate-500">
                                            8–72 characters, including a letter
                                            and a number.
                                        </span>
                                    </label>
                                </>
                            )}
                            <fieldset className="space-y-2">
                                <legend className="mb-2 text-sm font-medium">
                                    Roles{" "}
                                    <span className="text-red-600">*</span>
                                </legend>
                                {roles.map((role) => (
                                    <label
                                        key={role.role_UUID}
                                        className="flex min-h-11 items-center gap-3 text-sm"
                                    >
                                        <input
                                            name="roles"
                                            type="checkbox"
                                            value={role.role_UUID}
                                            defaultChecked={account?.roles.some(
                                                (value) =>
                                                    value.role_UUID ===
                                                    role.role_UUID,
                                            )}
                                        />
                                        {role.role_name}
                                    </label>
                                ))}
                            </fieldset>
                            <button className={button_styles()} type="submit">
                                {pending ? "Saving…" : "Save account"}
                            </button>
                        </fieldset>
                        {id === user?.account_UUID && (
                            <p className="text-sm text-slate-600">
                                You cannot change your own roles.
                            </p>
                        )}
                        {save_error && (
                            <p role="alert" className="text-sm text-red-700">
                                {save_error}
                            </p>
                        )}
                        <button
                            type="button"
                            disabled={pending}
                            className={button_styles("secondary")}
                            onClick={() => navigate("/users")}
                        >
                            Cancel
                        </button>
                    </form>
                </FormDialog>
            </>
        );
    if (detail)
        return (
            <section className="mx-auto max-w-3xl space-y-5">
                <Link
                    className="text-sm text-blue-700 underline"
                    to={`/${kind}`}
                >
                    Back to {kind}
                </Link>
                <PageHeader
                    title_id="page_title"
                    title={
                        account
                            ? `${account.employee.f_name} ${account.employee.l_name}`
                            : `${employee!.f_name} ${employee!.l_name}`
                    }
                    actions={
                        account &&
                        account.account_UUID !== user?.account_UUID ? (
                            <Link
                                to={`/users/${account.account_UUID}/edit`}
                                className={button_styles()}
                            >
                                Edit roles
                            </Link>
                        ) : undefined
                    }
                />
                <Card title="Details">
                    <dl className="grid gap-4 sm:grid-cols-2">
                        {(account
                            ? [
                                  ["Username", account.username],
                                  [
                                      "Employee number",
                                      account.employee.emp_number,
                                  ],
                                  [
                                      "Roles",
                                      account.roles
                                          .map((role) => role.role_name)
                                          .join(", "),
                                  ],
                                  ["Account status", account.account_status],
                                  [
                                      "Last sign-in",
                                      account.last_login_at
                                          ? new Date(
                                                account.last_login_at,
                                            ).toLocaleString()
                                          : "Not yet signed in",
                                  ],
                              ]
                            : [
                                  ["Employee number", employee!.emp_number],
                                  ["Position", employee!.position],
                                  ["Base", employee!.base?.base_name],
                                  [
                                      "Employment status",
                                      employee!.employment_status?.status_name,
                                  ],
                                  [
                                      "Contact details",
                                      employee!.contacts
                                          ?.map(
                                              (item) =>
                                                  `${item.contact.contact_type}: ${item.contact.contact_value}`,
                                          )
                                          .join(" · "),
                                  ],
                                  ["Category", employee!.personnel_category],
                                  ["Record status", employee!.record_status],
                              ]
                        ).map(([label, value]) => (
                            <div key={label}>
                                <dt className="text-sm text-slate-500">
                                    {label}
                                </dt>
                                <dd className="mt-1 text-sm font-medium">
                                    {value || "Not recorded"}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </Card>
                {employee && (
                    <Card title="Qualifications and licenses">
                        {employee.licenses.length ? (
                            employee.licenses.map((license, index) => (
                                <div
                                    key={license.emp_license_UUID || index}
                                    className="border-b border-slate-100 py-3 text-sm"
                                >
                                    <p className="font-medium">
                                        {license.license_type.license_type_name}{" "}
                                        · {license.license_number}
                                    </p>
                                    <p className="text-slate-600">
                                        {license.expiry_date
                                            ? `Expires ${new Date(license.expiry_date).toLocaleDateString()}`
                                            : "No expiry date recorded"}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-600">
                                No qualifications recorded.
                            </p>
                        )}
                    </Card>
                )}
            </section>
        );
    return list;
}
