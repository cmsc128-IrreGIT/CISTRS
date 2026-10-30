import { Link } from "react-router";
import Card from "../../../shared/components/ui/card";
import useMaintenance from "../hooks/use_maintenance";
import MaintenanceTable from "./maintenance_table";
export default function RelatedMaintenance({
    aircraft,
    part_number,
}: {
    aircraft?: string;
    part_number?: string;
}) {
    const rows = useMaintenance();
    const selected = rows.filter((row) =>
        aircraft
            ? row.aircraft === aircraft
            : part_number
              ? row.part_number === part_number
              : false,
    );
    const params = new URLSearchParams(
        aircraft ? { aircraft } : part_number ? { part: part_number } : {},
    );
    return (
        <Card
            title="Related maintenance"
            action={
                <Link
                    to={`/maintenance?${params}`}
                    className="inline-flex min-h-11 items-center rounded text-sm font-medium text-[#1d4ed8] underline focus-visible:outline-2"
                >
                    View all related records
                </Link>
            }
        >
            <MaintenanceTable
                rows={selected.slice(0, 3)}
                caption={`Maintenance for ${aircraft || part_number || "this record"}`}
            />
        </Card>
    );
}
