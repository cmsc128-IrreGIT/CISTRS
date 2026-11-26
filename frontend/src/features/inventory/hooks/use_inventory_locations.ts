import { get_inventory_locations } from "../services/inventory_services";
import useInventoryQuery from "./use_inventory_query";

export default function useInventoryLocations() {
    const { rows: locations, ...state } = useInventoryQuery(
        get_inventory_locations,
        true,
    );
    return { locations, ...state };
}
