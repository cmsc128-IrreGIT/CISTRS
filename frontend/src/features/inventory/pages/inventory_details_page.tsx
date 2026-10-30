import { Pencil } from "lucide-react";
import { Link, useParams } from "react-router";
import BackLink from "../../../shared/components/navigation/back_link";
import Card from "../../../shared/components/ui/card";
import DetailsList, {
    type DetailEntry,
} from "../../../shared/components/ui/details_list";
import StatusBadge from "../../../shared/components/ui/status_badge";
import { button_styles } from "../../../shared/styles/button_styles";
import InventoryHistoryTable from "../components/inventory_history_table";
import InventoryNotFound from "../components/inventory_not_found";
import useInventory from "../hooks/use_inventory";
import useInventoryHistory from "../hooks/use_inventory_history";

export default function InventoryDetailsPage() {
    const { item_id } = useParams();

    const {
        items,
        is_loading,
        error,
    } = useInventory();

    const {
        history,
        is_loading: is_history_loading,
        error: history_error,
    } = useInventoryHistory();

    const item = items.find(
        (record) => record.part_UUID === item_id,
    );

    if (is_loading) {
        return (
            <Card>
                <p className="text-sm text-slate-500">
                    Loading inventory item...
                </p>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <p className="text-sm text-red-600">
                    {error}
                </p>
            </Card>
        );
    }

    if (!item) {
        return (
            <Card>
                <InventoryNotFound />
            </Card>
        );
    }

    const item_history = history.filter(
        (transaction) =>
            transaction.status.part.part_UUID === item.part_UUID,
    );

    const details: DetailEntry[] = [
        {
            id: "part_number",
            label: "Part Number",
            value: item.part_number,
        },
        {
            id: "part_name",
            label: "Item Name",
            value: item.part_name,
        },
        {
            id: "unit_of_measure",
            label: "Unit of Measure",
            value: item.unit_of_measure,
        },
        {
            id: "min_stock_level",
            label: "Minimum Stock Level",
            value: `${item.min_stock_level} ${item.unit_of_measure}`,
        },
        {
            id: "availability",
            label: "Stock Availability",
            value: (
                <StatusBadge
                    tone={
                        item.total_quantity > 0
                            ? "success"
                            : "danger"
                    }
                >
                    {item.total_quantity > 0
                        ? "In stock"
                        : "Out of stock"}
                </StatusBadge>
            ),
        },
        {
            id: "total_quantity",
            label: "Total Quantity",
            value: `${item.total_quantity} ${item.unit_of_measure}`,
        },
        {
            id: "locations",
            label: "Inventory Location",
            value:
                item.locations.length === 0 ? (
                    "No location recorded"
                ) : (
                    <div className="space-y-1">
                        {item.locations.map((location) => (
                            <div key={location.status_UUID}>
                                <p className="font-medium text-slate-900">
                                    {location.location_name}
                                </p>

                                {location.storage_area && (
                                    <p className="text-sm text-slate-500">
                                        {location.storage_area}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                ),
        },
        {
            id: "suppliers",
            label: "Supplier",
            value:
                item.suppliers.length === 0
                    ? "No supplier recorded"
                    : item.suppliers.join(", "),
        },
        {
            id: "manufacturers",
            label: "Manufacturer",
            value:
                item.manufacturers.length === 0
                    ? "No manufacturer recorded"
                    : item.manufacturers.join(", "),
        },
        {
            id: "description",
            label: "Description",
            value:
                item.description || "No description provided.",
        },
    ];

    return (
        <section
            aria-labelledby="page_title"
            className="space-y-4"
        >
            <BackLink
                to="/inventory"
                label="Back to inventory"
            />

            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <p className="text-xs font-medium text-slate-500">
                    Inventory / Item details
                </p>

                <h1
                    id="page_title"
                    className="mt-1 text-3xl font-semibold tracking-tight text-slate-900"
                >
                    {item.part_name}
                </h1>
            </div>

            <Link
                to={`/inventory/${item.part_UUID}/edit`}
                className={button_styles()}
            >
                <Pencil size={18} aria-hidden="true"/>
                Edit details
            </Link>
        </div>
            <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-600">
                            Current stock
                        </p>

                        <p className="mt-1 text-2xl font-semibold text-slate-900">
                            {item.total_quantity}{" "}
                            {item.unit_of_measure}
                            {item.total_quantity !== 1
                                ? "s"
                                : ""}{" "}
                            available
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button" 
                            className="min-h-10 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
                        >
                            Receive stock
                        </button>

                        <button
                            type="button"
                            className="min-h-10 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                            Issue stock
                        </button>
                    </div>
                </div>
            </Card>

            <Card title="Item Information">
                <DetailsList entries={details} />

                <p className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500">
                    Stock availability reflects quantity only, not
                    approval for aircraft use.
                </p>
            </Card>

            <Card title="Item History">
                {is_history_loading ? (
                    <p className="text-sm text-slate-500">
                        Loading item history...
                    </p>
                ) : history_error ? (
                    <p className="text-sm text-red-600">
                        {history_error}
                    </p>
                ) : (
                    <InventoryHistoryTable
                        rows={item_history}
                        caption={`History for ${item.part_name}`}
                    />
                )}
            </Card>
        </section>
    );
}