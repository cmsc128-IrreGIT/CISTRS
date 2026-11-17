import { get_inventory_history } from "../services/inventory_services";
import useInventoryQuery from "./use_inventory_query";

export default function useInventoryHistory(enabled = true) {
  const { rows: history, is_loading, error, reload } =
    useInventoryQuery(get_inventory_history, enabled);
  return { history, is_loading, error, reload };
}
