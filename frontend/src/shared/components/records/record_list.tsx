import { useState } from "react";
import { Link } from "react-router";
import Card from "../ui/card";
import PageHeader from "../ui/page_header";
import DataTable from "../ui/data_table";
import type { TableColumn } from "../ui/data_table";
import SearchInput from "../forms/search_input";
import PreviewNotice from "../feedback/preview_notice";
import { button_styles } from "../../styles/button_styles";
import type { PreviewRecord, RecordConfig } from "../../types/record_types";

export default function RecordList({
    config,
    rows,
    can_add = true,
}: {
    config: RecordConfig;
    rows: PreviewRecord[];
    can_add?: boolean;
}) {
    const [search, set_search] = useState("");
    const term = search.trim().toLowerCase();
    const filtered = rows.filter((row) =>
        config.fields.some(({ key }) =>
            (row[key] ?? "").toLowerCase().includes(term),
        ),
    );
    const columns: TableColumn<PreviewRecord>[] = [
        ...config.fields.slice(0, 4).map(({ key, label }) => ({
            id: key,
            header: label,
            render: (row: PreviewRecord) => row[key] || "—",
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
            <PreviewNotice>
                Fictional preview records · Changes reset on refresh.{" "}
                {config.note}
            </PreviewNotice>
            <Card>
                <SearchInput
                    value={search}
                    on_change={set_search}
                    label={`Search ${config.title}`}
                    placeholder={`Search ${config.title.toLowerCase()}`}
                    className="mb-4 sm:max-w-md"
                />
                <p role="status" className="mb-3 text-sm text-slate-500">
                    {filtered.length} records shown
                </p>
                <DataTable
                    caption={config.title}
                    rows={filtered}
                    columns={columns}
                    get_row_key={(row) => row.id}
                    empty_title={
                        term ? "No matching records" : "No records yet"
                    }
                />
            </Card>
        </section>
    );
}
