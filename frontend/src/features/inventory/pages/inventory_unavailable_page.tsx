import EmptyState from "../../../shared/components/feedback/empty_state";
import Card from "../../../shared/components/ui/card";
import {
    InventoryBreadcrumbs,
    InventoryTabs,
} from "../components/inventory_workspace";

export default function InventoryUnavailablePage({ title }: { title: string }) {
    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <InventoryBreadcrumbs current={title} />
            <h1 id="page_title" className="sr-only">
                {title}
            </h1>
            <Card>
                <InventoryTabs />
                <EmptyState
                    title={
                        title === "Change History"
                            ? "Change history is unavailable"
                            : "Restock requests are unavailable"
                    }
                    description={
                        title === "Change History"
                            ? "Past edits to inventory items aren’t available in this workspace yet."
                            : "This workspace does not provide these records yet."
                    }
                />
            </Card>
        </section>
    );
}
