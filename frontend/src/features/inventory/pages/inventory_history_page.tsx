import BackLink from "../../../shared/components/navigation/back_link";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import InventoryHistoryTable from "../components/inventory_history_table";
import useInventoryHistory from "../hooks/use_inventory_history";

export default function InventoryHistoryPage() {
    const {
        history,
        is_loading,
        error,
        reload,
    } = useInventoryHistory();

    return (
        <section aria-labelledby="page_title" className="space-y-6">
            <BackLink to="/inventory" label="Back to inventory" />

            <PageHeader
                title="Inventory Change History"
                title_id="page_title"
                description="Additions and updates across all inventory items."
            />

            <Card>
                {is_loading ? (
                    <p className="p-6 text-sm text-slate-600">
                        Loading inventory history...
                    </p>
                ) : error ? (
                    <div className="space-y-3 p-6">
                        <p className="text-sm text-red-600">{error}</p>

                        <button
                            type="button"
                            onClick={reload}
                            className="font-medium text-blue-700 underline underline-offset-2"
                        >
                            Try again
                        </button>
                    </div>
                ) : (
                    <InventoryHistoryTable rows={history} />
                )}
            </Card>
        </section>
    );
}