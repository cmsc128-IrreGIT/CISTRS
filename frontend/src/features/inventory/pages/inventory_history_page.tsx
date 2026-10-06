import PreviewNotice from "../../../shared/components/feedback/preview_notice";
import BackLink from "../../../shared/components/navigation/back_link";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import InventoryHistoryTable from "../components/inventory_history_table";
import useInventoryHistory from "../hooks/use_inventory_history";

export default function InventoryHistoryPage() {
    const history = useInventoryHistory();

    return (
        <section aria-labelledby="page_title" className="space-y-6">
            <BackLink to="/inventory" label="Back to inventory" />

            <PageHeader
                title="Inventory Change History"
                title_id="page_title"
                description="Additions and updates across all inventory items."
            />

            <PreviewNotice>
                Preview history resets on refresh and does not identify an authenticated user.
            </PreviewNotice>

            <Card>
                <InventoryHistoryTable rows={history} />
            </Card>
        </section>
    );
}