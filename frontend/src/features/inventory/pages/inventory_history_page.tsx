import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import InventoryHistoryTable from "../components/inventory_history_table";
import useInventoryHistory from "../hooks/use_inventory_history";

export default function InventoryHistoryPage() {
    const history = useInventoryHistory();

    return (
        <section aria-labelledby="page_title" className="space-y-6">
            <Link to="/inventory" className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-600 hover:text-red-700">
                <ArrowLeft size={18} aria-hidden="true" />
                Back to inventory
            </Link>

            <PageHeader
                title="Inventory Change History"
                title_id="page_title"
                description="Additions and updates across all inventory items."
            />

            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Preview history resets on refresh and does not identify an authenticated user.
            </p>

            <Card>
                <InventoryHistoryTable rows={history} />
            </Card>
        </section>
    );
}