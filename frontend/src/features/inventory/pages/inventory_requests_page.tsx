import { Plus } from "lucide-react";
import { useContext, useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import DataTable from "../../../shared/components/ui/data_table";
import type { TableColumn } from "../../../shared/components/ui/data_table";
import Pagination from "../../../shared/components/ui/pagination";
import StatusBadge from "../../../shared/components/ui/status_badge";
import EmptyState from "../../../shared/components/feedback/empty_state";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import useTablePagination from "../../../shared/hooks/use_table_pagination";
import { AuthContext } from "../../auth/hooks/auth_context";
import { InventoryBreadcrumbs, InventoryTabs } from "../components/inventory_workspace";
import { RequestDetailsDialog, RequestResultDialog, RequestStockDialog } from "../components/inventory_request_dialog";
import { WorkflowError } from "../components/inventory_workflow_fields";
import { INVENTORY_CORRECTIONS_PATH, INVENTORY_PRIMARY_ACTION } from "../constants/inventory_constants";
import {
    INVENTORY_REQUEST_PAGE_COPY,
    REQUEST_PREVIEW_NOTICE,
    REQUEST_STATUS_LABELS,
} from "../constants/inventory_workflow_constants";
import useActiveInventory from "../hooks/use_active_inventory";
import { useInventoryRequestPreviews } from "../hooks/use_inventory_request_previews";
import type { InventoryRequestPreview } from "../types/inventory_types";
import { can_review_inventory_requests, inventory_location_label, inventory_request_date } from "../utils/inventory_workflows";

export default function InventoryRequestsPage({
    correction = false,
}: {
    correction?: boolean;
}) {
    const user = useContext(AuthContext)?.user;
    const can_review = can_review_inventory_requests(user?.position?.position_name || user?.roles?.join(" ") || "");
    const [params] = useSearchParams();
    const kind = correction ? "CORRECTION" : "RESTOCK";
    const copy = INVENTORY_REQUEST_PAGE_COPY[kind];
    const [creating, set_creating] = useState(false);
    const [selected, set_selected] = useState<InventoryRequestPreview>();
    const [message, set_message] = useState("");
    const { items, is_loading, error, reload } = useActiveInventory();
    const records = useInventoryRequestPreviews();
    const rows = records.filter((request) => request.kind === kind);
    const { visible_rows, footer } = useTablePagination(rows, kind);

    if (!correction && params.get("kind") === "correction") {
        return <Navigate replace to={INVENTORY_CORRECTIONS_PATH} />;
    }

    const columns: TableColumn<InventoryRequestPreview>[] = [
        { id: "date", header: "Date requested", render: (row) => inventory_request_date(row.created_at) },
        { id: "item", header: "Item", render: (row) => row.part.part_name },
        {
            id: "quantity",
            header: copy.quantity_header,
            render: (row) => `${row.quantity} ${row.part.unit_of_measure}`,
        },
        {
            id: "destination",
            header: copy.destination_header,
            render: (row) => correction && row.location
                ? inventory_location_label(row.location)
                : inventory_request_date(row.needed_by),
        },
        { id: "requester", header: "Requested by", render: (row) => row.requester },
        { id: "status", header: "Status", render: (row) => (
            <StatusBadge tone={row.status === "APPROVED" ? "success" : "warning"}>{REQUEST_STATUS_LABELS[row.status]}</StatusBadge>
        ) },
        { id: "action", header: "Action", render: (row) => (
            <Button variant="ghost" className="underline underline-offset-4" onClick={() => set_selected(row)}>
                {row.status === "PENDING" && can_review ? "Review" : "View details"}
            </Button>
        ) },
    ];

    return (
        <section aria-labelledby="page_title" className="space-y-4">
            <InventoryBreadcrumbs current={copy.title} />
            <h1 id="page_title" className="sr-only">{copy.title}</h1>
            <Card>
                <InventoryTabs />
                <p className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-slate-700">{REQUEST_PREVIEW_NOTICE}</p>
                {!correction && (
                    <div className="mb-4 flex justify-end">
                        <Button className={INVENTORY_PRIMARY_ACTION} disabled={!items.length}
                            onClick={() => set_creating(true)}><Plus size={16} aria-hidden="true" /> Request stock</Button>
                    </div>
                )}
                {error ? (
                    <>
                        <WorkflowError message={error} />
                        <Button variant="ghost" onClick={() => void reload()}>Try again</Button>
                    </>
                ) : is_loading ? (
                    <ScreenLoading compact label="Loading inventory items…" />
                ) : !rows.length ? (
                    <EmptyState title={copy.empty_title} description={copy.empty_description} />
                ) : (
                    <>
                        <DataTable inventory caption={copy.title}
                            columns={columns} rows={visible_rows} get_row_key={(row) => row.request_UUID} />
                        <Pagination {...footer} item_label="request" />
                    </>
                )}
            </Card>
            {creating && <RequestStockDialog items={items} on_close={() => set_creating(false)}
                on_preview={() => {
                    set_creating(false);
                    set_message("Request preview added");
                }} />}
            {selected && <RequestDetailsDialog key={selected.request_UUID} request={selected} can_review={can_review}
                on_close={() => set_selected(undefined)}
                on_reviewed={(status) => {
                    set_selected(undefined);
                    set_message(status === "APPROVED" ? "Approval preview" : "Return preview");
                }} />}
            {message && <RequestResultDialog message={message} on_close={() => set_message("")} />}
        </section>
    );
}
