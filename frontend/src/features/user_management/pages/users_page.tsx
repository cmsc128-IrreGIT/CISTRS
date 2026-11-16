import { Plus } from "lucide-react";
import { useState } from "react";
import { Link, Outlet } from "react-router";
import SearchInput from "../../../shared/components/forms/search_input";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Card from "../../../shared/components/ui/card";
import DataTable from "../../../shared/components/ui/data_table";
import Pagination from "../../../shared/components/ui/pagination";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import { button_styles } from "../../../shared/styles/button_styles";
import AccountStatus from "../components/account_status";
import { account_action_style, account_field_style } from "../config/user_management_config";
import useUserManagement from "../hooks/use_user_management";
import { account_name } from "../types/user_account";

const sign_in_format = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export default function UsersPage() {
    const workspace = useUserManagement();
    const [search, set_search] = useState("");
    const [role, set_role] = useState("");
    const [status, set_status] = useState("");
    const term = search.trim().toLowerCase();
    const rows = workspace.accounts.map((account) => ({
        account,
        name: account_name(account),
        role: account.employee.position?.position_name || "Not recorded",
        status: workspace.previews?.get(account.account_UUID)?.status ?? account.account_status,
        preview: workspace.previews?.has(account.account_UUID),
    }));
    const roles = [...new Set(rows.map((row) => row.role))].sort();
    const statuses = [...new Set(rows.map((row) => row.status))].sort();
    const filtered = rows.filter((row) =>
        (!role || row.role === role) && (!status || row.status === status) &&
        [row.name, row.account.username].some((value) => value.toLowerCase().includes(term)),
    );
    const { visible_rows, footer } = useTablePagination(filtered, JSON.stringify([term, role, status]));

    return (
        <section aria-labelledby="page_title" className="min-w-0 space-y-4">
            <WorkspaceBreadcrumbs current="User Accounts" />
            <h1 id="page_title" className="sr-only">User Accounts</h1>
            <p className="text-sm text-slate-600">Manage sign-in accounts and their linked personnel.</p>
            <Card>
                <h2 className="mb-4 font-semibold text-[#0b2238]">System accounts</h2>
                <div className="filter-toolbar mb-4 rounded-lg bg-slate-100 p-3">
                    <div className="filter-toolbar-search grid gap-1.5">
                        <p aria-hidden="true" className="text-sm text-slate-700">Search accounts</p>
                        <SearchInput label="Search accounts" placeholder="Search name or username" value={search} on_change={set_search} />
                    </div>
                    <label className="filter-toolbar-field grid gap-1.5 text-sm text-slate-700">
                        System role
                        <select className={account_field_style} value={role} onChange={(event) => set_role(event.currentTarget.value)}>
                            <option value="">All roles</option>
                            {roles.map((value) => <option key={value}>{value}</option>)}
                        </select>
                    </label>
                    <label className="filter-toolbar-field grid gap-1.5 text-sm text-slate-700">
                        Account status
                        <select className={account_field_style} value={status} onChange={(event) => set_status(event.currentTarget.value)}>
                            <option value="">All statuses</option>
                            {statuses.map((value) => <option key={value}>{value}</option>)}
                        </select>
                    </label>
                    <div className="filter-toolbar-actions">
                        <Link to="/users/new" className={`${button_styles()} ${account_action_style}`}>
                            <Plus size={16} aria-hidden="true" /> Add account
                        </Link>
                    </div>
                </div>
                <DataTable inventory caption="System accounts" rows={visible_rows} get_row_key={(row) => row.account.account_UUID}
                    empty_title="No matching accounts" columns={[
                        { id: "name", header: "Name / username", render: (row) => (
                            <><span className="block font-medium">{row.name}</span><span className="text-slate-600">{row.account.username}</span></>
                        ) },
                        { id: "role", header: "System role", render: (row) => row.role },
                        { id: "status", header: "Account status", render: (row) => <AccountStatus status={row.status} preview={row.preview} /> },
                        { id: "last_login", header: "Last sign-in", render: ({ account }) => {
                            const login = Date.parse(account.last_login_at ?? "");
                            return Number.isFinite(login) ? sign_in_format.format(login) : "Not yet signed in";
                        } },
                        { id: "action", header: "Action", render: (row) => (
                            <Link to={`/users/${encodeURIComponent(row.account.account_UUID)}`} aria-label={`Manage ${row.name}`}
                                className="font-medium text-link">Manage</Link>
                        ) },
                    ]} />
                {filtered.length > footer.default_page_size && <Pagination {...footer} item_label="account" />}
            </Card>
            <Outlet context={workspace} />
        </section>
    );
}
