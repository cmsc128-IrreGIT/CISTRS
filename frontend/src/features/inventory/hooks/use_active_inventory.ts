import useInventory from "./use_inventory";
import useDecommissionedInventory from "./use_inventory_decommission";

export default function useActiveInventory(enabled = true) {
    const inventory = useInventory(enabled);
    const { is_decommissioned } = useDecommissionedInventory();

    return {
        ...inventory,
        all_items: inventory.items,
        items: inventory.items.filter(
            (item) => !is_decommissioned(item.part_UUID),
        ),
    };
}
