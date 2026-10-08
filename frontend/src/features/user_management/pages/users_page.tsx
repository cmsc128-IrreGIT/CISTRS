import { useState } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import PreviewNotice from "../../../shared/components/feedback/preview_notice";
import SearchInput from "../../../shared/components/forms/search_input";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import Pagination from "../../../shared/components/ui/pagination";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import type { PreviewRecord } from "../../../shared/types/record_types";
import { button_styles } from "../../../shared/styles/button_styles";
import StatusBadge from "../../../shared/components/ui/status_badge";
import useUserManagement from "../hooks/use_user_management";

const columns: TableColumn<PreviewRecord>[] = [
    {
        id: "name",
        header: "Name",
        render: (row) => (
            <Link
                to={`/users/${row.id}`}
                className="text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
            >
                {row.display_name}
            </Link>
        ),
    },
    { id: "username", header: "Username", render: (row) => row.username },
    { id: "role", header: "Role", render: (row) => row.role },
    {
        id: "status",
        header: "Status",
        render: (row) => (
            <StatusBadge tone={row.status === "Active" ? "success" : "neutral"}>
                {row.status}
            </StatusBadge>
        ),
    },
    {
        id: "actions",
        header: "Actions",
        render: (row) => (
            <div className="flex min-h-11 items-center gap-4">
                <Link
                    aria-label={`View ${row.display_name}`}
                    to={`/users/${row.id}`}
                    className="text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
                >
                    View
                </Link>
                <Link
                    aria-label={`Edit ${row.display_name}`}
                    to={`/users/${row.id}/edit`}
                    className="text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
                >
                    Edit
                </Link>
            </div>
        ),
    },
];
export default function UsersPage() {
    const rows = useUserManagement();
    const [search, set_search] = useState("");
    const [pagination, set_pagination] = useState({ key: "", page: 1 });
    const term = search.trim().toLowerCase();
    const filtered = rows
        .filter((row) =>
            [
                row.display_name,
                row.username,
                row.email,
                row.role,
                row.status,
            ].some((value) => value.toLowerCase().includes(term)),
        )
        .sort((a, b) => a.display_name.localeCompare(b.display_name));
    const filter_key = search;
    const page_size = 10;
    const total_pages = Math.max(1, Math.ceil(filtered.length / page_size));
    const page =
        pagination.key === filter_key
            ? Math.min(pagination.page, total_pages)
            : 1;
    const visible = filtered.slice((page - 1) * page_size, page * page_size);
    return (
        <section aria-labelledby="page_title" className="space-y-5">
            <PageHeader
                title="Users"
                title_id="page_title"
                description="Review account records, roles, and status."
                actions={
                    <Link to="/users/new" className={button_styles()}>
                        <Plus size={18} aria-hidden="true" />
                        Add User
                    </Link>
                }
            />
            <PreviewNotice>
                Preview accounts · Saving records does not create logins or
                enforce permissions.
            </PreviewNotice>
            <Card>
                <div className="mb-5 max-w-md">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                        Search users
                    </p>
                    <SearchInput
                        label="Search users"
                        value={search}
                        on_change={set_search}
                        placeholder="Name, username, email, role, or status"
                    />
                </div>
                <p role="status" className="mb-3 text-sm text-slate-500">
                    {filtered.length} matching accounts
                </p>
                <DataTable
                    columns={columns}
                    rows={visible}
                    get_row_key={(row) => row.id}
                    caption="User account records"
                    empty_title={
                        term ? "No matching users" : "No user records yet"
                    }
                    empty_description="Add an account record or try another search."
                />
                <div className="mt-4">
                    <Pagination
                        page={page}
                        total_pages={total_pages}
                        on_page_change={(next_page) =>
                            set_pagination({ key: filter_key, page: next_page })
                        }
                    />
                </div>
            </Card>
        </section>
    );
}
