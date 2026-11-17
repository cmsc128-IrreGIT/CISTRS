import { useSyncExternalStore } from "react";
import { availability_service } from "../services/availability_service";

export default function useAvailability() {
    return useSyncExternalStore(availability_service.subscribe, availability_service.list);
}
