import { useState } from "react";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import BackLink from "../../../shared/components/navigation/back_link";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import SearchInput from "../../../shared/components/forms/search_input";
import Pagination from "../../../shared/components/ui/pagination";
import InventoryHistoryTable from "../components/inventory_history_table";
import useInventoryHistory from "../hooks/use_inventory_history";
export default function InventoryHistoryPage() {
    const { history, is_loading, error, reload } = useInventoryHistory();
    const [search, set_search] = useState("");
    const [action, set_action] = useState("");
    const [pagination, set_pagination] = useState({ key: "", page: 1 });
    const term = search.trim().toLowerCase();
    const types = Array.from(
        new Set(history.map((row) => row.transaction_type)),
    ).sort();
    const filtered = history
        .filter(
            (row) =>
                (!action || row.transaction_type === action) &&
                [
                    row.status.part.part_name,
                    row.status.part.part_number,
                    row.status.location.location_name,
                    row.updater.f_name,
                    row.updater.l_name,
                    row.remarks ?? "",
                ].some((value) => value.toLowerCase().includes(term)),
        )
        .sort(
            (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
        );
    const key = `${term}|${action}`;
    const total = Math.max(1, Math.ceil(filtered.length / 5));
    const page = pagination.key === key ? Math.min(pagination.page, total) : 1;
    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <BackLink to="/inventory" label="Back to inventory" />
            <PageHeader
                title="Inventory Change History"
                title_id="page_title"
                description="Recorded stock movements, quantities, locations, and responsible staff."
                help="Search by item, part number, location, staff, or remarks. Records are shown newest first. Open the item name to review the associated part."
            />
            <Card>
                {is_loading ? (
                    <ScreenLoading compact label="Loading inventory history…" />
                ) : error ? (
                    <div role="alert" className="text-sm text-red-700">
                        <p>{error}</p>
                        <button
                            type="button"
                            onClick={() => void reload()}
                            className="mt-2 min-h-11 rounded font-medium text-[#1d4ed8] underline focus-visible:outline-2"
                        >
                            Try again
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                            <SearchInput
                                value={search}
                                on_change={set_search}
                                label="Search inventory history"
                                placeholder="Item, part number, location, staff, or remarks"
                                className="w-full sm:max-w-md"
                            />
                            <label className="flex items-center gap-2 text-sm text-slate-600">
                                Action
                                <select
                                    value={action}
                                    onChange={(event) =>
                                        set_action(event.currentTarget.value)
                                    }
                                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"
                                >
                                    <option value="">All actions</option>
                                    {types.map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <p
                            role="status"
                            className="mb-3 text-sm text-slate-500"
                        >
                            {filtered.length} history records
                        </p>
                        {history.length > 0 && filtered.length === 0 ? (
                            <p className="py-4 text-sm text-slate-600">
                                No history records match these filters.
                            </p>
                        ) : (
                            <InventoryHistoryTable
                                rows={filtered.slice((page - 1) * 5, page * 5)}
                            />
                        )}
                        <div className="mt-3">
                            <Pagination
                                page={page}
                                total_pages={total}
                                on_page_change={(next) =>
                                    set_pagination({ key, page: next })
                                }
                            />
                        </div>
                    </>
                )}
            </Card>
        </section>
    );
}
