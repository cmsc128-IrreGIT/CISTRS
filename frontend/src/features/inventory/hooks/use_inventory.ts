import { get_inventory } from "../services/inventory_services";
import useInventoryQuery from "./use_inventory_query";

export default function useInventory(enabled = true) {
  const { rows: items, is_loading, error, reload, refresh } =
    useInventoryQuery(get_inventory, enabled);
  return { items, is_loading, error, reload, refresh };
}
