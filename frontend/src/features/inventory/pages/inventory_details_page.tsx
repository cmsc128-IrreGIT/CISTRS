import { ArrowLeft, Pencil } from "lucide-react";
import { Link, useParams } from "react-router";
import EmptyState from "../../../shared/components/feedback/empty_state";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import StatusBadge from "../../../shared/components/ui/status_badge";
import { button_styles } from "../../../shared/styles/button_styles";
import InventoryHistoryTable from "../components/inventory_history_table";
import useInventory from "../hooks/use_inventory";
import useInventoryHistory from "../hooks/use_inventory_history";

export default function InventoryDetailsPage() {
    const { item_id } = useParams();
    const items = useInventory();
    const history = useInventoryHistory();
    const item = items.find((record) => record.id === item_id);
    const item_history = history.filter((entry) => entry.item_id === item_id);

    if (!item) {
        return (
            <Card>
                <EmptyState
                    title="Item not found"
                    description="The item may not exist or may have been cleared by a preview refresh."
                    action={
                        <Link to="/inventory" className={button_styles("secondary")}>
                            Return to inventory
                        </Link>
                    }
                />
            </Card>
        );
    }

    const details = [
        { label: "Part Number", value: item.part_number },
        { label: "Category", value: item.category },
        { label: "Quantity", value: `${item.quantity} ${item.unit}` },
        { label: "Associated Aircraft", value: item.aircraft ?? "Unassigned" },
    ];

    return (
        <section aria-labelledby="page_title" className="space-y-6">
            <Link to="/inventory" className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-600 hover:text-red-700">
                <ArrowLeft size={18} aria-hidden="true" />
                Back to inventory
            </Link>

            <PageHeader
                title={item.name}
                title_id="page_title"
                description="Inventory Item Details"
                actions={
                    <Link to={`/inventory/${item.id}/edit`} className={button_styles()}>
                        <Pencil size={18} aria-hidden="true" />
                        Edit Item
                    </Link>
                }
            />

            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Preview only. Records and history reset on refresh.
                Changes are not associated with an authenticated user yet.
            </p>

            <Card title="Item Information">
                <dl className="grid gap-5 sm:grid-cols-2">
                    {details.map(({ label, value }) => (
                        <div key={label}>
                            <dt className="text-sm text-slate-500">{label}</dt>
                            <dd className="mt-1 break-words font-medium text-slate-900">
                                {value}
                            </dd>
                        </div>
                    ))}

                    <div>
                        <dt className="text-sm text-slate-500">Stock Availability</dt>
                        <dd className="mt-2">
                            <StatusBadge tone={item.quantity > 0 ? "success" : "danger"}>
                                {item.quantity > 0 ? "In stock" : "Out of stock"}
                            </StatusBadge>
                        </dd>
                    </div>
                </dl>

                <p className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500">
                    Stock availability reflects quantity only, not approval for aircraft use.
                </p>
            </Card>

            <Card
                title="Item Change History"
                action={
                    <Link to="/inventory/history" className={button_styles("ghost")}>
                        View All History
                    </Link>
                }
            >
                <InventoryHistoryTable
                    rows={item_history}
                    caption={`Change history for ${item.name}`}
                />
            </Card>
        </section>
    );
}