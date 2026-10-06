import { Pencil } from "lucide-react";
import { Link, useParams } from "react-router";
import PreviewNotice from "../../../shared/components/feedback/preview_notice";
import BackLink from "../../../shared/components/navigation/back_link";
import Card from "../../../shared/components/ui/card";
import DetailsList, { type DetailEntry } from "../../../shared/components/ui/details_list";
import PageHeader from "../../../shared/components/ui/page_header";
import StatusBadge from "../../../shared/components/ui/status_badge";
import { button_styles } from "../../../shared/styles/button_styles";
import InventoryHistoryTable from "../components/inventory_history_table";
import InventoryNotFound from "../components/inventory_not_found";
import { inventory_detail_fields } from "../config/inventory_fields";
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
                <InventoryNotFound />
            </Card>
        );
    }

    const details: DetailEntry[] = [
        ...inventory_detail_fields.map(({ id, label, get_value }) => ({
            id,
            label,
            value: get_value(item),
        })),
        {
            id: "availability",
            label: "Stock Availability",
            value: (
                <StatusBadge tone={item.quantity > 0 ? "success" : "danger"}>
                    {item.quantity > 0 ? "In stock" : "Out of stock"}
                </StatusBadge>
            ),
        },
    ];

    return (
        <section aria-labelledby="page_title" className="space-y-6">
            <BackLink to="/inventory" label="Back to inventory" />

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

            <PreviewNotice>
                Preview only. Records and history reset on refresh.
                Changes are not associated with an authenticated user yet.
            </PreviewNotice>

            <Card title="Item Information">
                <DetailsList entries={details} />

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