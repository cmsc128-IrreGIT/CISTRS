import { useState } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import PreviewNotice from "../../../shared/components/feedback/preview_notice";
import SearchInput from "../../../shared/components/forms/search_input";
import FormField from "../../../shared/components/forms/form_field";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import Pagination from "../../../shared/components/ui/pagination";
import { button_styles } from "../../../shared/styles/button_styles";
import LogbookTable from "../components/logbook_table";
import LogbookDetails from "../components/logbook_details";
import { logbook_preview_note } from "../config/logbook_config";
import useLogbook from "../hooks/use_logbook";

export default function LogbookPage() {
    const rows = useLogbook();
    const [search, set_search] = useState("");
    const [date, set_date] = useState("");
    const [selected_id, set_selected_id] = useState<string | null>(null);
    const [pagination, set_pagination] = useState({ key: "", page: 1 });
    const term = search.trim().toLowerCase();
    const filtered = rows
        .filter(
            (row) =>
                (!date || row.entry_date === date) &&
                [
                    row.aircraft,
                    row.station_from,
                    row.station_to,
                    row.defects,
                    row.action_taken,
                    row.commander_name,
                    row.log_page,
                ].some((value) => value.toLowerCase().includes(term)),
        )
        .sort((first, second) =>
            second.entry_date.localeCompare(first.entry_date),
        );
    const filter_key = JSON.stringify([search, date]);
    const total_pages = Math.max(1, Math.ceil(filtered.length / 10));
    const page =
        pagination.key === filter_key
            ? Math.min(pagination.page, total_pages)
            : 1;
    const selected = rows.find((row) => row.id === selected_id);
    return (
        <section aria-labelledby="page_title" className="space-y-5">
            <PageHeader
                title="Aircraft Technical Logbook"
                title_id="page_title"
                description="Review flight references, defects, and recorded maintenance actions."
                actions={
                    <Link to="/logbook/new" className={button_styles()}>
                        <Plus size={18} aria-hidden="true" />
                        Add Entry
                    </Link>
                }
            />
            <PreviewNotice>{logbook_preview_note}</PreviewNotice>
            <Card>
                <div className="mb-5 flex flex-wrap items-end gap-4">
                    <div className="min-w-0 flex-1 basis-64">
                        <p className="mb-2 text-sm font-medium text-slate-700">
                            Search logbook
                        </p>
                        <SearchInput
                            label="Search logbook"
                            value={search}
                            on_change={set_search}
                            placeholder="Aircraft, station, defects, action, commander, or page"
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <FormField id="logbook_date" label="Entry date">
                            {(props) => (
                                <input
                                    {...props}
                                    type="date"
                                    value={date}
                                    onChange={(event) =>
                                        set_date(event.currentTarget.value)
                                    }
                                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-2 focus:outline-red-600"
                                />
                            )}
                        </FormField>
                    </div>
                    {(term || date) && (
                        <Button
                            variant="ghost"
                            onClick={() => {
                                set_search("");
                                set_date("");
                            }}
                        >
                            Clear filters
                        </Button>
                    )}
                </div>
                <p role="status" className="mb-3 text-sm text-slate-500">
                    {filtered.length} matching entries
                </p>
                <LogbookTable
                    rows={filtered.slice((page - 1) * 10, page * 10)}
                    selected_id={selected_id}
                    on_select={set_selected_id}
                    is_filtered={Boolean(term || date)}
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
            <div id="log_entry_details">
                {selected ? (
                    <LogbookDetails
                        entry={selected}
                        on_close={() => set_selected_id(null)}
                    />
                ) : (
                    <p className="text-sm text-slate-500">
                        Select View to review an entry below the table.
                    </p>
                )}
            </div>
        </section>
    );
}
