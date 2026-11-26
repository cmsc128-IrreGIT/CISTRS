import { Plus } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, Outlet, useSearchParams } from "react-router";
import SearchInput from "../../../shared/components/forms/search_input";
import WorkspaceBreadcrumbs from "../../../shared/components/navigation/workspace_breadcrumbs";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import Pagination from "../../../shared/components/ui/pagination";
import useRecordHighlight from "../../../shared/hooks/use_record_highlight";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import { button_styles } from "../../../shared/styles/button_styles";
import PersonnelTabs from "../components/personnel_tabs";
import PersonnelStatus from "../components/personnel_status";
import { usePersonnelDirectory } from "../hooks/use_personnel_directory";
import type { PersonnelRecord } from "../types/personnel_types";
import { personnel_options } from "../utils/personnel_records";

const select_style =
    "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8]";

export default function PersonnelPage() {
    const directory = usePersonnelDirectory();
    const highlight = useRecordHighlight();
    const { rows, availability, can_manage } = directory;
    const [params] = useSearchParams();
    const [search, set_search] = useState("");
    const [department, set_department] = useState("");
    const [position, set_position] = useState("");
    const term = search.trim().toLowerCase();
    const filtered = rows.filter(
        (row) =>
            (!department ||
                row.department.trim().toLowerCase() ===
                    department.trim().toLowerCase()) &&
            (!position ||
                row.position.trim().toLowerCase() ===
                    position.trim().toLowerCase()) &&
            [
                row.name,
                row.employee_number,
                row.position,
                row.department,
                row.category,
            ].some((value) => value.toLowerCase().includes(term)),
    );
    const employee_matches = (row: PersonnelRecord) =>
        row.id === highlight?.id ||
        row.employee_number.trim().toUpperCase() === highlight?.id;
    const target_row_index = highlight
        ? filtered.findIndex(employee_matches)
        : -1;
    const highlight_row =
        highlight && target_row_index >= 0
            ? { id: filtered[target_row_index].id, ref: highlight.ref }
            : undefined;
    const { visible_rows, footer } = useTablePagination(
        filtered,
        JSON.stringify([term, department, position]),
        undefined,
        target_row_index,
    );

    const columns: TableColumn<PersonnelRecord>[] = [
        {
            id: "name",
            header: "Name / employee ID",
            render: (row) => (
                <>
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-xs font-medium text-slate-600">
                        {row.employee_number}
                    </p>
                </>
            ),
        },
        {
            id: "position",
            header: "Position",
            render: (row) => row.position || "Not recorded",
        },
        {
            id: "department",
            header: "Department",
            render: (row) => row.department || "Not recorded",
        },
        {
            id: "availability",
            header: "Availability",
            render: (row) => (
                <PersonnelStatus
                    availability
                    status={availability.get(row.id)?.status}
                />
            ),
        },
        ...(directory.full_access
            ? [
                  {
                      id: "action",
                      header: "Action",
                      render: (row: PersonnelRecord) => (
                          <Link
                              to={`/personnel/${encodeURIComponent(row.id)}`}
                              aria-label={`View ${row.name}`}
                              className="font-medium text-link"
                          >
                              View details
                          </Link>
                      ),
                  },
              ]
            : []),
    ];

    if (params.get("tab") === "availability")
        return <Navigate to="/personnel/availability" replace />;

    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <WorkspaceBreadcrumbs current="Personnel" />
            <h1 id="page_title" className="sr-only">
                Personnel
            </h1>
            <Card>
                <PersonnelTabs
                    active="directory"
                    availability_visible={directory.can_view_availability}
                />
                <div className="filter-toolbar mb-4 rounded-lg bg-slate-50 p-3">
                    <div className="filter-toolbar-search grid gap-1.5">
                        <p
                            aria-hidden="true"
                            className="text-sm text-slate-700"
                        >
                            Search personnel
                        </p>
                        <SearchInput
                            label="Search personnel"
                            value={search}
                            on_change={set_search}
                            placeholder="Name or employee ID"
                        />
                    </div>
                    <label className="filter-toolbar-field grid gap-1.5 text-sm text-slate-700">
                        Department
                        <select
                            className={select_style}
                            value={department}
                            onChange={(event) =>
                                set_department(event.currentTarget.value)
                            }
                        >
                            <option value="">All departments</option>
                            {personnel_options(rows, "department").map(
                                (option) => (
                                    <option key={option}>{option}</option>
                                ),
                            )}
                        </select>
                    </label>
                    <label className="filter-toolbar-field grid gap-1.5 text-sm text-slate-700">
                        Position
                        <select
                            className={select_style}
                            value={position}
                            onChange={(event) =>
                                set_position(event.currentTarget.value)
                            }
                        >
                            <option value="">All positions</option>
                            {personnel_options(rows, "position").map(
                                (option) => (
                                    <option key={option}>{option}</option>
                                ),
                            )}
                        </select>
                    </label>
                    <div className="filter-toolbar-actions">
                        {(term || department || position) && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    set_search("");
                                    set_department("");
                                    set_position("");
                                }}
                            >
                                Clear filters
                            </Button>
                        )}
                        {can_manage && (
                            <Link
                                to="/personnel/new"
                                className={button_styles("primary")}
                            >
                                <Plus size={16} aria-hidden="true" /> Add
                                personnel
                            </Link>
                        )}
                    </div>
                </div>
                {highlight && !rows.some(employee_matches) && (
                    <p role="status" className="mb-3 text-sm text-slate-600">
                        The employee linked from this notification is
                        unavailable.
                    </p>
                )}
                <DataTable
                    inventory
                    caption="Personnel directory"
                    columns={columns}
                    rows={visible_rows}
                    get_row_key={(row) => row.id}
                    highlight_row={highlight_row}
                    empty_title={
                        rows.length
                            ? "No matching personnel"
                            : "No personnel records"
                    }
                />
                {filtered.length > footer.default_page_size && (
                    <Pagination
                        {...footer}
                        item_label="person"
                        plural_label="people"
                    />
                )}
            </Card>
            <Outlet context={directory} />
        </section>
    );
}
