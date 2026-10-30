import type { ReactNode } from "react";
import { useState } from "react";
import { Link } from "react-router";
import Card from "../ui/card";
import PageHeader from "../ui/page_header";
import DataTable from "../ui/data_table";
import type { TableColumn } from "../ui/data_table";
import Pagination from "../ui/pagination";
import StatusBadge from "../ui/status_badge";
import SearchInput from "../forms/search_input";
import { button_styles } from "../../styles/button_styles";
import type { PreviewRecord, RecordConfig } from "../../types/record_types";

export default function RecordList({
    config,
    rows,
    can_add = true,
    render_value,
}: {
    config: RecordConfig;
    rows: PreviewRecord[];
    can_add?: boolean;
    render_value?: (row: PreviewRecord, key: string) => ReactNode;
}) {
    const [search, set_search] = useState("");
    const [status, set_status] = useState("");
    const [pagination, set_pagination] = useState({ key: "", page: 1 });
    const statuses = Array.from(
        new Set(rows.map((row) => row.status).filter(Boolean)),
    ).sort();
    const term = search.trim().toLowerCase();
    const filtered = rows.filter(
        (row) =>
            (!status || row.status === status) &&
            config.fields.some(({ key }) =>
                (row[key] ?? "").toLowerCase().includes(term),
            ),
    );
    const filter_key = `${term}|${status}`;
    const total_pages = Math.max(1, Math.ceil(filtered.length / 5));
    const page =
        pagination.key === filter_key
            ? Math.min(pagination.page, total_pages)
            : 1;
    const visible = filtered.slice((page - 1) * 5, page * 5);
    const columns: TableColumn<PreviewRecord>[] = [
        ...config.fields.slice(0, 4).map(({ key, label }) => ({
            id: key,
            header: label,
            render: (row: PreviewRecord) =>
                render_value ? (
                    render_value(row, key)
                ) : key === "status" ? (
                    <StatusBadge
                        tone={
                            row[key] === "Operational" ||
                            row[key] === "Completed"
                                ? "success"
                                : row[key] === "Out of Service"
                                  ? "danger"
                                  : "warning"
                        }
                    >
                        {row[key] || "Status unavailable"}
                    </StatusBadge>
                ) : (
                    row[key] || "—"
                ),
        })),
        {
            id: "actions",
            header: "Actions",
            render: (row) => (
                <Link
                    className="text-slate-600 underline underline-offset-4 hover:text-slate-900"
                    aria-label={`${config.details ? "View" : "Edit"} ${row[config.fields[0].key]}`}
                    to={`${config.base_path}/${row.id}${config.details ? "" : "/edit"}`}
                >
                    {config.details ? "View" : "Edit"}
                </Link>
            ),
        },
    ];
    return (
        <section className="space-y-5" aria-labelledby="page_title">
            <PageHeader
                title={config.title}
                title_id="page_title"
                help={`Search records, open a record to review details, or use the available action to update it. ${config.note ?? ""}`}
                actions={
                    can_add && (
                        <Link
                            to={`${config.base_path}/new`}
                            className={button_styles()}
                        >
                            Add {config.singular}
                        </Link>
                    )
                }
            />
            <Card>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <SearchInput
                        value={search}
                        on_change={set_search}
                        label={`Search ${config.title}`}
                        placeholder={`Search ${config.title.toLowerCase()}`}
                        className="w-full sm:max-w-md"
                    />
                    {statuses.length > 0 && (
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            Status
                            <select
                                value={status}
                                onChange={(event) =>
                                    set_status(event.currentTarget.value)
                                }
                                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 focus-visible:outline-2 focus-visible:outline-[#1d4ed8]"
                            >
                                <option value="">All statuses</option>
                                {statuses.map((value) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                </div>
                <p role="status" className="mb-3 text-sm text-slate-500">
                    {filtered.length} records shown
                </p>
                <DataTable
                    caption={config.title}
                    rows={visible}
                    bounded
                    columns={columns}
                    get_row_key={(row) => row.id}
                    empty_title={
                        term ? "No matching records" : "No records yet"
                    }
                />
                <div className="mt-3">
                    <Pagination
                        page={page}
                        total_pages={total_pages}
                        on_page_change={(next) =>
                            set_pagination({ key: filter_key, page: next })
                        }
                    />
                </div>
            </Card>
        </section>
    );
}
