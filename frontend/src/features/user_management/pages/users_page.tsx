import { Plus } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useSearchParams } from "react-router";
import SearchInput from "../../../shared/components/forms/search_input";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Card from "../../../shared/components/ui/card";
import Button from "../../../shared/components/ui/button";
import DataTable from "../../../shared/components/ui/data_table";
import Pagination from "../../../shared/components/ui/pagination";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import { button_styles } from "../../../shared/styles/button_styles";
import AccountStatus from "../components/account_status";
import ReferenceDataDialog from "../components/reference_data_dialog";
import { account_field_style } from "../config/user_management_config";
import useUserManagement from "../hooks/use_user_management";
import { account_name } from "../types/user_account";

const sign_in_format = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});

export default function UsersPage() {
    const workspace = useUserManagement();
    const [search, set_search] = useState("");
    const [position, set_position] = useState("");
    const [status, set_status] = useState("");
    const [params, set_params] = useSearchParams();
    const adding_reference = params.get("form") === "add-reference-data";

    function set_adding_reference(open: boolean) {
        set_params(
            (current) => {
                const next = new URLSearchParams(current);
                if (open) next.set("form", "add-reference-data");
                else next.delete("form");
                return next;
            },
            { replace: true, preventScrollReset: true },
        );
    }

    const term = search.trim().toLowerCase();
    const rows = workspace.accounts.map((account) => ({
        account,
        name: account_name(account),
        position: account.employee.position?.position_name || "Not recorded",
        status:
            workspace.previews?.get(account.account_UUID)?.status ??
            account.account_status,
        preview: workspace.previews?.has(account.account_UUID),
    }));
    const positions = [...new Set(rows.map((row) => row.position))].sort();
    const statuses = [...new Set(rows.map((row) => row.status))].sort();
    const filtered = rows.filter(
        (row) =>
            (!position || row.position === position) &&
            (!status || row.status === status) &&
            [row.name, row.account.username].some((value) =>
                value.toLowerCase().includes(term),
            ),
    );
    const { visible_rows, footer } = useTablePagination(
        filtered,
        JSON.stringify([term, position, status]),
    );

    return (
        <section aria-labelledby="page_title" className="min-w-0 space-y-4">
            <WorkspaceBreadcrumbs current="User Accounts" />
            <h1 id="page_title" className="sr-only">
                User Accounts
            </h1>
            <p className="text-sm text-slate-600">
                Manage sign-in accounts and their linked personnel.
            </p>
            <Card>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-semibold text-[#0b2238]">
                        System accounts
                    </h2>
                    <Button
                        variant="secondary"
                        onClick={() => set_adding_reference(true)}
                    >
                        <Plus size={18} aria-hidden="true" /> Add reference data
                    </Button>
                </div>
                <div className="filter-toolbar mb-4 rounded-lg bg-slate-100 p-3">
                    <div className="filter-toolbar-search grid gap-1.5">
                        <p
                            aria-hidden="true"
                            className="text-sm text-slate-700"
                        >
                            Search accounts
                        </p>
                        <SearchInput
                            label="Search accounts"
                            placeholder="Search name or username"
                            value={search}
                            on_change={set_search}
                        />
                    </div>
                    <label className="filter-toolbar-field grid gap-1.5 text-sm text-slate-700">
                        Position
                        <select
                            className={account_field_style}
                            value={position}
                            onChange={(event) =>
                                set_position(event.currentTarget.value)
                            }
                        >
                            <option value="">All positions</option>
                            {positions.map((value) => (
                                <option key={value}>{value}</option>
                            ))}
                        </select>
                    </label>
                    <label className="filter-toolbar-field grid gap-1.5 text-sm text-slate-700">
                        Account status
                        <select
                            className={account_field_style}
                            value={status}
                            onChange={(event) =>
                                set_status(event.currentTarget.value)
                            }
                        >
                            <option value="">All statuses</option>
                            {statuses.map((value) => (
                                <option key={value}>{value}</option>
                            ))}
                        </select>
                    </label>
                    <div className="filter-toolbar-actions">
                        <Link
                            to="/users/new"
                            className={button_styles("primary")}
                        >
                            <Plus size={16} aria-hidden="true" /> Add account
                        </Link>
                    </div>
                </div>
                <DataTable
                    inventory
                    caption="System accounts"
                    rows={visible_rows}
                    get_row_key={(row) => row.account.account_UUID}
                    empty_title="No matching accounts"
                    columns={[
                        {
                            id: "name",
                            header: "Name / username",
                            render: (row) => (
                                <>
                                    <span className="block font-semibold">
                                        {row.name}
                                    </span>
                                    <span className="font-medium text-slate-600">
                                        {row.account.username}
                                    </span>
                                </>
                            ),
                        },
                        {
                            id: "position",
                            header: "Position",
                            render: (row) => row.position,
                        },
                        {
                            id: "status",
                            header: "Account status",
                            render: (row) => (
                                <AccountStatus
                                    status={row.status}
                                    preview={row.preview}
                                />
                            ),
                        },
                        {
                            id: "last_login",
                            header: "Last sign-in",
                            render: ({ account }) => {
                                const login = Date.parse(
                                    account.last_login_at ?? "",
                                );
                                return Number.isFinite(login)
                                    ? sign_in_format.format(login)
                                    : "Not yet signed in";
                            },
                        },
                        {
                            id: "action",
                            header: "Action",
                            render: (row) => (
                                <Link
                                    to={`/users/${encodeURIComponent(row.account.account_UUID)}`}
                                    aria-label={`Manage ${row.name}`}
                                    className="font-medium text-link"
                                >
                                    Manage
                                </Link>
                            ),
                        },
                    ]}
                />
                {filtered.length > footer.default_page_size && (
                    <Pagination {...footer} item_label="account" />
                )}
            </Card>
            {adding_reference && (
                <ReferenceDataDialog
                    on_close={() => set_adding_reference(false)}
                />
            )}
            <Outlet context={workspace} />
        </section>
    );
}
