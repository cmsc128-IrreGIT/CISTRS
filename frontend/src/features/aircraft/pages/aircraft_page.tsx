import { Pencil } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import SearchInput from "../../../shared/components/forms/search_input";
import PageHeader from "../../../shared/components/ui/page_header";
import Card from "../../../shared/components/ui/card";
import DataTable from "../../../shared/components/ui/data_table";
import Pagination from "../../../shared/components/ui/pagination";
import AircraftBreadcrumbs from "../components/aircraft_breadcrumbs";
import AircraftStatusBadge from "../components/aircraft_status_badge";
import { aircraft_config } from "../config/aircraft_config";
import useAircraft from "../hooks/use_aircraft";

const select_field =
    "mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-[#1d4ed8]";

export default function AircraftPage() {
    const rows = useAircraft();
    const [search, set_search] = useState("");
    const [status, set_status] = useState("");
    const [requested_page, set_page] = useState(1);
    const statuses = [
        ...new Set([
            ...(
                aircraft_config.fields.find((field) => field.key === "status")
                    ?.options || []
            ).map((option) =>
                typeof option === "string" ? option : option.value,
            ),
            ...rows.map((row) => row.status).filter(Boolean),
        ]),
    ];
    const term = search.trim().toLowerCase();
    const filtered = rows.filter(
        (row) =>
            (!status || row.status === status) &&
            [row.registration, row.model, row.current_aircraft_hours].some(
                (value) => value?.toLowerCase().includes(term),
            ),
    );
    const total_pages = Math.max(1, Math.ceil(filtered.length / 5));
    const page = Math.min(requested_page, total_pages);

    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <AircraftBreadcrumbs />
            <PageHeader
                title="Aircraft"
                title_id="page_title"
                description="Review aircraft information, recorded status, and related maintenance."
                help="Search by registration, aircraft type, or current aircraft hours. Open an aircraft for its details and maintenance records. Update status opens the existing status form."
            />
            <Card compact>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                    <div>
                        <p className="mb-2 text-sm font-medium text-slate-700">
                            Search aircraft
                        </p>
                        <SearchInput
                            value={search}
                            on_change={(value) => {
                                set_search(value);
                                set_page(1);
                            }}
                            label="Search aircraft"
                            placeholder="Registration / tail no. or aircraft type"
                        />
                    </div>
                    <label className="block text-sm font-medium text-slate-700">
                        Status
                        <select
                            value={status}
                            onChange={(event) => {
                                set_status(event.target.value);
                                set_page(1);
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
                <div className="my-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <p role="status">{filtered.length} records shown</p>
                    <p>Aircraft type, hours, and status are preview values.</p>
                </div>
                <DataTable
                    bounded
                    caption="Aircraft records"
                    rows={filtered.slice((page - 1) * 5, page * 5)}
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
                                    className="font-medium text-[#1d4ed8] underline underline-offset-4"
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
                                        className="inline-flex min-h-11 items-center font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
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
                />
                {total_pages > 1 && (
                    <div className="mt-3">
                        <Pagination
                            page={page}
                            total_pages={total_pages}
                            on_page_change={set_page}
                        />
                    </div>
                )}
            </Card>
        </section>
    );
}
