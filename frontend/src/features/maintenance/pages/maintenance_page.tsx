import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import PageHeader from "../../../shared/components/ui/page_header";
import Card from "../../../shared/components/ui/card";
import SearchInput from "../../../shared/components/forms/search_input";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import Pagination from "../../../shared/components/ui/pagination";
import { button_styles } from "../../../shared/styles/button_styles";
import useAircraft from "../../aircraft/hooks/use_aircraft";
import useMaintenance from "../hooks/use_maintenance";
import MaintenanceTable from "../components/maintenance_table";
export default function MaintenancePage() {
    const rows = useMaintenance();
    const aircraft = useAircraft();
    const [params, set_params] = useSearchParams();
    const [search, set_search] = useState("");
    const selected = params.get("aircraft") ?? "";
    const part = params.get("part") ?? "";
    const status = params.get("status") ?? "";
    function set_filter(key: string, value: string) {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value);
        else next.delete(key);
        set_params(next, { replace: true });
    }
    const term = search.trim().toLowerCase();
    const due_limit = new Date();
    due_limit.setHours(0, 0, 0, 0);
    due_limit.setDate(due_limit.getDate() + 30);
    const filtered = rows.filter(
        (row) =>
            (!selected || row.aircraft === selected) &&
            (!part || row.part_number === part) &&
            (status === "due"
                ? row.status !== "Completed" &&
                  new Date(`${row.due_date}T00:00:00`) <= due_limit
                : status === "pending"
                  ? row.status !== "Completed"
                  : !status || row.status === status) &&
            [row.title, row.aircraft, row.part_number, row.notes].some(
                (value) => (value || "").toLowerCase().includes(term),
            ),
    );
    const { visible_rows, footer } = useTablePagination(
        filtered,
        JSON.stringify([term, selected, part, status]),
    );
    const aircraft_options = Array.from(
        new Set(
            [
                ...aircraft.map((row) => row.registration),
                ...rows.map((row) => row.aircraft),
                selected,
            ].filter(Boolean),
        ),
    ).sort();
    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <PageHeader
                title="Maintenance"
                title_id="page_title"
                description="Review maintenance by aircraft, status, or related part."
                actions={
                    <Link to="/maintenance/new" className={button_styles()}>
                        Add maintenance record
                    </Link>
                }
            />
            <Card>
                <div className="mb-3 flex flex-wrap items-end gap-3">
                    <SearchInput
                        value={search}
                        on_change={set_search}
                        label="Search maintenance"
                        placeholder="Maintenance task, aircraft, part number, or notes"
                        className="w-full sm:max-w-sm"
                    />
                    <label className="flex flex-col gap-1 text-sm text-slate-600">
                        Aircraft
                        <select
                            value={selected}
                            onChange={(e) =>
                                set_filter("aircraft", e.currentTarget.value)
                            }
                            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"
                        >
                            <option value="">All aircraft</option>
                            {aircraft_options.map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-slate-600">
                        Status
                        <select
                            value={status}
                            onChange={(e) =>
                                set_filter("status", e.currentTarget.value)
                            }
                            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"
                        >
                            <option value="">All statuses</option>
                            <option value="pending">Pending tasks</option>
                            <option value="due">Due soon or overdue</option>
                            {["Scheduled", "In Progress", "Completed"].map(
                                (value) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ),
                            )}
                        </select>
                    </label>
                    {(selected || part || status || term) && (
                        <button
                            type="button"
                            onClick={() => {
                                set_params({});
                                set_search("");
                            }}
                            className={button_styles("ghost")}
                        >
                            Clear filters
                        </button>
                    )}
                </div>
                {part && (
                    <p className="mb-2 text-sm text-slate-600">
                        Related part: <strong>{part}</strong>
                    </p>
                )}
                <MaintenanceTable rows={visible_rows} />
                <Pagination {...footer} item_label="maintenance record" />
            </Card>
        </section>
    );
}
