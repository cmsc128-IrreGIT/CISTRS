import { Archive, Pencil } from "lucide-react";
import { useContext, useState } from "react";
import { Link, Outlet, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import EmptyState from "../../../shared/components/feedback/empty_state";
import ScreenLoading from "../../../shared/components/feedback/screen_loading";
import { get_inventory_access } from "../../../shared/components/navigation/workspace";
import Button from "../../../shared/components/ui/button";
import Card from "../../../shared/components/ui/card";
import { button_styles } from "../../../shared/styles/button_styles";
import { AuthContext } from "../../auth/hooks/auth_context";
import InventoryItemInformation from "../components/inventory_item_information";
import InventoryItemStockHistory from "../components/inventory_item_stock_history";
import InventoryItemUsage from "../components/inventory_item_usage";
import InventoryLifecycleDialog from "../components/inventory_lifecycle_dialog";
import InventoryStockWorkflowDialog from "../components/inventory_stock_workflow_dialog";
import type { STOCK_WORKFLOW_TITLES } from "../constants/inventory_workflow_constants";
import InventoryNotFound from "../components/inventory_not_found";
import { InventoryBreadcrumbs } from "../components/inventory_workspace";
import {
    INVENTORY_PRIMARY_ACTION,
    STOCK_STATUS_LABELS,
    STOCK_STATUS_STYLES,
    inventory_tab_style,
} from "../constants/inventory_constants";
import {
    INVENTORY_DETAIL_TAB_PARAM,
    INVENTORY_DETAIL_TABS,
} from "../constants/inventory_detail_constants";
import useInventory from "../hooks/use_inventory";
import useDecommissionedInventory from "../hooks/use_inventory_decommission";
import { get_stock_status } from "../utils/stock_status";

export default function InventoryDetailsPage() {
    const inventory = useInventory();

    return (
        <>
            <InventoryDetails inventory={inventory} />
            <Outlet context={inventory} />
        </>
    );
}

function InventoryDetails({
    inventory,
}: {
    inventory: ReturnType<typeof useInventory>;
}) {
    const { item_id } = useParams();
    const navigate = useNavigate();
    const [search_params] = useSearchParams();
    const { search } = useLocation();
    const read_only =
        get_inventory_access(useContext(AuthContext)?.user ?? null) === "read";
    const { decommission_item, is_decommissioned } = useDecommissionedInventory();
    const [decommission_id, set_decommission_id] = useState<string | null>(null);
    const [workflow, set_workflow] = useState<{ part_id: string; mode: keyof typeof STOCK_WORKFLOW_TITLES }>();
    const { items, is_loading, error, reload } = inventory;

    const item = items.find((record) => record.part_UUID === item_id);
    if (is_loading) {
        return (
            <Card>
                <ScreenLoading compact label="Loading inventory item…" />
            </Card>
        );
    }
    if (error) {
        return (
            <Card>
                <div role="alert" className="text-sm text-red-700">
                    <p>{error}</p>
                    <Button variant="ghost" onClick={() => void reload()}>
                        Try again
                    </Button>
                </div>
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

    const tabs = INVENTORY_DETAIL_TABS.filter(
        (tab) => !read_only || tab.read_only,
    );
    const selected_tab = search_params.get(INVENTORY_DETAIL_TAB_PARAM);
    const default_tab = INVENTORY_DETAIL_TABS[0];
    const active_tab = tabs.find((tab) => tab.id === selected_tab) ?? default_tab;
    const stock_status = get_stock_status(item);
    const decommissioned = is_decommissioned(item.part_UUID);

    return (
        <section aria-labelledby="page_title" className="min-w-0 space-y-4">
            <InventoryBreadcrumbs current={item.part_name} read_only={read_only} />
            <Card>
                <h1
                    id="page_title"
                    className="mb-3 min-w-0 wrap-anywhere text-2xl font-semibold tracking-tight text-[#0b2238]"
                >
                    {item.part_name}
                </h1>
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-slate-200 bg-slate-100 px-3 py-3 sm:px-4">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                        <h2 className="text-sm font-medium text-slate-600">Current stock</h2>
                        <div className="flex min-w-0 flex-wrap items-center gap-2 border-l border-slate-300 pl-3">
                            <p className="wrap-anywhere text-lg font-semibold tabular-nums text-[#0b2238]">
                                {item.total_quantity} {item.unit_of_measure}
                            </p>
                            <span className={`rounded-md px-2 py-1 text-xs font-medium ${decommissioned ? "border border-slate-200 bg-white text-slate-700" : STOCK_STATUS_STYLES[stock_status]}`}>
                                {decommissioned ? "Decommissioned" : STOCK_STATUS_LABELS[stock_status]}
                            </span>
                        </div>
                    </div>
                    {!read_only && !decommissioned && (
                        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                            <Button className="flex-1 sm:flex-none"
                                onClick={() => set_workflow({ part_id: item.part_UUID, mode: "receive" })}>
                                Receive stock
                            </Button>
                            <Button className={`flex-1 sm:flex-none ${INVENTORY_PRIMARY_ACTION}`}
                                disabled={item.total_quantity <= 0}
                                onClick={() => set_workflow({ part_id: item.part_UUID, mode: "issue" })}>
                                Issue stock
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            <Card>
                <nav aria-label="Item detail sections" className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
                    {tabs.map(({ id, label, icon: Icon }) => {
                        const params = new URLSearchParams(search_params);
                        if (id === default_tab.id) params.delete(INVENTORY_DETAIL_TAB_PARAM);
                        else params.set(INVENTORY_DETAIL_TAB_PARAM, id);
                        const query = params.toString();
                        const active = active_tab.id === id;
                        return (
                            <Link
                                key={id}
                                to={{ search: query ? `?${query}` : "" }}
                                aria-current={active ? "page" : undefined}
                                className={inventory_tab_style(active)}
                            >
                                <Icon size={16} aria-hidden="true" /> {label}
                            </Link>
                        );
                    })}
                </nav>
                <section aria-label={active_tab.label}>
                    {active_tab.id === "information" && (
                        <>
                            <InventoryItemInformation item={item} />
                            {!read_only && (
                                <div className="mt-5 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
                                    {!decommissioned && (
                                        <Button
                                            variant="secondary"
                                            onClick={() => set_decommission_id(item.part_UUID)}
                                        >
                                            <Archive size={17} aria-hidden="true" /> Decommission part
                                        </Button>
                                    )}
                                    <Link
                                        to={{ pathname: "edit", search }}
                                        state={{ from_inventory: true }}
                                        className={button_styles("secondary")}
                                    >
                                        <Pencil size={17} aria-hidden="true" /> Edit details
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                    {active_tab.id === "stock-history" && (
                        <>
                            {!read_only && !decommissioned && (
                                <div className="mb-3 flex justify-end">
                                    <Button
                                        variant="secondary"
                                        onClick={() => set_workflow({ part_id: item.part_UUID, mode: "correction" })}
                                    >
                                        Request stock correction
                                    </Button>
                                </div>
                            )}
                            <InventoryItemStockHistory
                                key={item.part_UUID}
                                part_id={item.part_UUID}
                            />
                        </>
                    )}
                    {active_tab.id === "record-changes" && (
                        <EmptyState
                            title="Record changes are unavailable"
                            description="Past edits to this item aren’t available in this workspace yet."
                        />
                    )}
                    {active_tab.id === "history-and-usage" && (
                        <InventoryItemUsage part_number={item.part_number} />
                    )}
                </section>
            </Card>

            {active_tab.id === "information" && (
                <p className="px-1 text-sm text-slate-600">
                    Stock availability reflects quantity only. Approval for aircraft use is separate.
                </p>
            )}

            {workflow?.part_id === item.part_UUID && !read_only && !decommissioned && (
                <InventoryStockWorkflowDialog key={workflow.mode} mode={workflow.mode} item={item}
                    items={items} on_close={() => set_workflow(undefined)} />
            )}

            {decommission_id === item.part_UUID && !read_only && !decommissioned && (
                <InventoryLifecycleDialog item={item} on_close={() => set_decommission_id(null)}
                    on_saved={() => {
                        decommission_item(item.part_UUID);
                        set_decommission_id(null);
                        navigate("/inventory/decommissioned");
                    }} />
            )}
        </section>
    );
}
