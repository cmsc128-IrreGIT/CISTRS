import { useCallback, useState } from "react";
import { Link } from "react-router";
import DataTable from "../../../shared/components/ui/data_table";
import Button from "../../../shared/components/ui/button";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import useInventoryQuery from "../hooks/use_inventory_query";
import { get_inventory_aircraft, get_inventory_history } from "../services/inventory_services";
import { employee_name } from "../../../shared/utils/employee_name";
import type { InventoryAircraftLink, InventoryItem } from "../types/inventory_types";
import InventoryReturnDialog from "./inventory_return_dialog";

export default function InventoryItemUsage({
    item, read_only, on_saved,
}: {
    item: InventoryItem;
    read_only: boolean;
    on_saved: () => void;
}) {
    const fetch_links = useCallback(async () => {
        const [aircraft, history] = await Promise.all([
            get_inventory_aircraft(item.part_UUID),
            get_inventory_history(item.part_UUID),
        ]);
        const issues = history.filter((row) => row.transaction_type === "ISSUE")
            .sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at));
        return aircraft.map((row) => {
            const latest_issue = issues.find((issue) => issue.aircraft_UUID === row.aircraft_UUID);
            return { ...row, recorded_by: latest_issue ? employee_name(latest_issue.updater) : "Not recorded" };
        });
    }, [item.part_UUID]);
    const { rows, is_loading, error, reload, refresh } = useInventoryQuery(fetch_links, true);
    const [selected, set_selected] = useState<InventoryAircraftLink>();
    return <div className="space-y-5">
        <section className="space-y-3" aria-label="Aircraft assignments">
            <h2 className="font-semibold">Aircraft assignments</h2>
            {is_loading ? <ScreenLoading compact label="Loading aircraft assignments..." /> : error ? <div role="alert"><p className="text-sm text-red-700">{error}</p><Button variant="ghost" onClick={() => void reload()}>Try again</Button></div> : <DataTable
                inventory caption="Aircraft assignments" rows={rows} get_row_key={(row) => row.aircraft_UUID}
                empty_title="No aircraft assignments" empty_description="Stock issued to an aircraft will appear here."
                columns={[
                    { id: "aircraft", header: "Aircraft", render: (row) => <Link to={`/aircraft/${row.aircraft_UUID}`} className="cursor-pointer text-link">{row.registration}</Link> },
                    { id: "quantity", header: "Quantity on aircraft", render: (row) => `${row.quantity_on_aircraft} ${item.unit_of_measure}` },
                    { id: "employee", header: "Recorded by", render: (row) => row.recorded_by || "Not recorded" },
                    { id: "action", header: "Action", render: (row) => <div className="flex items-center gap-5">
                        {!read_only && <button type="button" className="min-h-8 font-semibold text-link" onClick={() => set_selected(row)}>Return</button>}
                    </div> },
                ]} />}
        </section>
        {selected && <InventoryReturnDialog item={item} aircraft={selected} on_close={() => set_selected(undefined)} on_saved={() => {
            void refresh();
            on_saved();
        }} />}
    </div>;
}
