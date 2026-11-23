import { Pencil } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import SearchInput from "../../../shared/components/forms/search_input";
import Card from "../../../shared/components/ui/card";
import DataTable from "../../../shared/components/ui/data_table";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import Pagination from "../../../shared/components/ui/pagination";
import AircraftBreadcrumbs from "../components/aircraft_breadcrumbs";
import AircraftStatusBadge from "../components/aircraft_status_badge";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import ErrorState from "../../../shared/components/feedback/error_state";
import { useAircraftData } from "../hooks/use_aircraft";

const select_field =
    "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-[#1d4ed8]";

export default function AircraftPage() {
    const { aircraft: rows, statuses: allowed_statuses, loading, error, reload } = useAircraftData();
    const [search, set_search] = useState("");
    const [status, set_status] = useState("");
    const statuses = [...new Set([...allowed_statuses.map((row) => row.status_name), ...rows.map((row) => row.status)])];
    const term = search.trim().toLowerCase();
    const filtered = rows.filter(
        (row) =>
            (!status || row.status === status) &&
            [row.registration, row.model, row.current_aircraft_hours].some(
                (value) => value?.toLowerCase().includes(term),
            ),
    );
    const { visible_rows, footer } = useTablePagination(
        filtered,
        JSON.stringify([search, status]),
    );

    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <AircraftBreadcrumbs />
            <h1 id="page_title" className="sr-only">Aircraft</h1>
            <Card>
                <div className="filter-toolbar mb-4 rounded-lg bg-slate-50 p-3">
                    <div className="filter-toolbar-search grid gap-1.5">
                        <p aria-hidden="true" className="text-sm text-slate-700">
                            Search aircraft
                        </p>
                        <SearchInput
                            value={search}
                            on_change={(value) => {
                                set_search(value);
                                footer.on_page_change(1);
                            }}
                            label="Search aircraft"
                            placeholder="Registration / tail no. or aircraft type"
                        />
                    </div>
                    <label className="filter-toolbar-field grid gap-1.5 text-sm text-slate-700">
                        Status
                        <select
                            value={status}
                            onChange={(event) => {
                                set_status(event.target.value);
                                footer.on_page_change(1);
                            }}
                            className={select_field}
                        >
                            <option value="">All statuses</option>
                            {statuses.map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                {loading ? <ScreenLoading compact label="Loading aircraft..." /> : error ? <ErrorState description={error} on_retry={reload} /> : <DataTable
                    inventory
                    bounded
                    caption="Aircraft records"
                    rows={visible_rows}
                    get_row_key={(row) => row.id}
                    empty_title={
                        search || status
                            ? "No matching aircraft"
                            : "No aircraft records"
                    }
                    empty_description="Try another registration, aircraft type, or status."
                    columns={[
                        {
                            id: "registration",
                            header: "Registration / Tail No.",
                            render: (row) => (
                                <Link
                                    to={`/aircraft/${row.id}`}
                                    className="font-medium text-link"
                                >
                                    {row.registration || "Not recorded"}
                                </Link>
                            ),
                        },
                        {
                            id: "model",
                            header: "Aircraft Type",
                            render: (row) => row.model || "Not recorded",
                        },
                        {
                            id: "current_aircraft_hours",
                            header: "Current Aircraft Hours",
                            render: (row) =>
                                row.current_aircraft_hours
                                    ? `${row.current_aircraft_hours} hrs`
                                    : "Not recorded",
                        },
                        {
                            id: "status",
                            header: "Recorded Status",
                            render: (row) => (
                                <AircraftStatusBadge status={row.status} />
                            ),
                        },
                        {
                            id: "actions",
                            header: "Actions",
                            render: (row) => (
                                <div className="flex flex-wrap items-center gap-4">
                                    <Link
                                        to={`/aircraft/${row.id}`}
                                        aria-label={`View ${row.registration}`}
                                        className="inline-flex min-h-11 items-center font-medium text-link"
                                    >
                                        View
                                    </Link>
                                    <Link
                                        to={`/aircraft/${row.id}/status`}
                                        title="Update status"
                                        aria-label={`Update status for ${row.registration}`}
                                        className="inline-flex size-11 items-center justify-center rounded text-[#1d4ed8] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8]"
                                    >
                                        <Pencil size={18} aria-hidden="true" />
                                    </Link>
                                </div>
                            ),
                        },
                    ]}
                />}
                {!loading && !error && <Pagination
                    {...footer}
                    item_label="aircraft"
                    plural_label="aircraft"
                />}
            </Card>
        </section>
    );
}
