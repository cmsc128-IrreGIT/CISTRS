import { Link } from "react-router";
import EmptyState from "../../../shared/components/feedback/empty_state";
import MaintenanceTable from "../../maintenance/components/maintenance_table";
import useMaintenance from "../../maintenance/hooks/use_maintenance";

export default function InventoryItemUsage({
    part_number,
}: {
    part_number: string;
}) {
    const records = useMaintenance();
    const related = records.filter((row) => row.part_number === part_number);
    if (!related.length) {
        return (
            <EmptyState
                title="No related maintenance records"
                description="Maintenance records linked to this part will appear here."
            />
        );
    }
    const params = new URLSearchParams({ part: part_number });

    return (
        <>
            <MaintenanceTable
                inventory
                rows={related}
                caption={`Maintenance for ${part_number}`}
            />
            <Link
                to={`/maintenance?${params}`}
                className="mt-2 inline-flex min-h-11 items-center rounded text-sm font-medium text-[#1d4ed8] underline focus-visible:outline-2"
            >
                View all related records
            </Link>
        </>
    );
}
