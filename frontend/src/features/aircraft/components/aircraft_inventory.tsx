import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../../../shared/api/client";
import ErrorState from "../../../shared/components/feedback/error_state";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import DataTable from "../../../shared/components/ui/data_table";

type AssignedPart = {
    part_UUID: string;
    part_number: string;
    part_name: string;
    unit_of_measure: string;
    quantity_on_aircraft: number;
};

export default function AircraftInventory({
    aircraft_id,
}: {
    aircraft_id: string;
}) {
    const [attempt, set_attempt] = useState(0);
    const [result, set_result] = useState<{
        attempt: number;
        parts: AssignedPart[];
        error?: string;
    }>();

    useEffect(() => {
        const controller = new AbortController();
        void api<{ parts: AssignedPart[] }>(
            `/inventory/aircraft/${encodeURIComponent(aircraft_id)}/parts`,
            { signal: controller.signal },
        )
            .then(({ parts }) => {
                if (!controller.signal.aborted) set_result({ attempt, parts });
            })
            .catch((cause: unknown) => {
                if (!controller.signal.aborted)
                    set_result({
                        attempt,
                        parts: [],
                        error:
                            cause instanceof Error
                                ? cause.message
                                : "Could not load assigned parts.",
                    });
            });
        return () => controller.abort();
    }, [aircraft_id, attempt]);

    if (result?.attempt !== attempt)
        return <ScreenLoading compact label="Loading assigned parts…" />;
    if (result.error)
        return (
            <ErrorState
                description={result.error}
                on_retry={() => set_attempt((value) => value + 1)}
            />
        );
    return (
        <DataTable
            inventory
            caption="Parts assigned to aircraft"
            rows={result.parts}
            get_row_key={(part) => part.part_UUID}
            empty_title="No parts assigned"
            columns={[
                {
                    id: "number",
                    header: "Part number",
                    render: (part) => (
                        <Link
                            className="text-link"
                            to={`/inventory/${encodeURIComponent(part.part_UUID)}`}
                        >
                            {part.part_number}
                        </Link>
                    ),
                    cell_class_name: "w-[30%] whitespace-nowrap",
                },
                {
                    id: "name",
                    header: "Part name",
                    render: (part) => part.part_name,
                    cell_class_name: "w-[45%]",
                },
                {
                    id: "quantity",
                    header: "Quantity on aircraft",
                    render: (part) =>
                        `${part.quantity_on_aircraft} ${part.unit_of_measure}`,
                    cell_class_name: "w-[25%] whitespace-nowrap tabular-nums",
                },
            ]}
        />
    );
}
