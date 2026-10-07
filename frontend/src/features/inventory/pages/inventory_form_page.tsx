import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import PreviewNotice from "../../../shared/components/feedback/preview_notice";
import Card from "../../../shared/components/ui/card";
import PageHeader from "../../../shared/components/ui/page_header";
import InventoryForm from "../components/inventory_form";
import InventoryNotFound from "../components/inventory_not_found";
import { save_inventory_item } from "../data/inventory_store";
import useInventory from "../hooks/use_inventory";
import type { InventoryFormValues } from "../types/inventory_types";

export default function InventoryFormPage() {
    const { item_id } = useParams();
    const navigate = useNavigate();
    const items = useInventory();
    const existing_item = items.find((item) => item.id === item_id);
    const is_editing = Boolean(item_id);

    function handle_save(values: InventoryFormValues) {
        try {
            save_inventory_item(values, item_id);
            toast.success(
                is_editing
                    ? "Preview item updated."
                    : "Item added to preview inventory.",
            );
            navigate("/inventory");
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Could not save the preview item.",
            );
        }
    }

    return (
        <section aria-labelledby="page_title" className="space-y-6">
            <PageHeader
                title={
                    is_editing ? "Edit Inventory Item" : "Add Inventory Item"
                }
                title_id="page_title"
                description="Record aircraft parts and supplies."
            />

            <PreviewNotice>
                Preview only. Changes reset when you refresh the page.
            </PreviewNotice>

            <Card>
                {is_editing && !existing_item ? (
                    <InventoryNotFound />
                ) : (
                    <InventoryForm
                        key={item_id ?? "new"}
                        initial_values={existing_item}
                        on_submit={handle_save}
                        submit_text={
                            is_editing
                                ? "Update Preview Item"
                                : "Add Preview Item"
                        }
                    />
                )}
            </Card>
        </section>
    );
}
