import { useEffect, useState } from "react";
import { availability_service } from "../services/personnel_service";
import type { AvailabilityRecord } from "../../../shared/api/client";

// Extended record with aliases for frontend compatibility
// Compatible with PreviewRecord { id: string; [field: string]: string }
export interface AvailabilityRecordExtended extends Omit<AvailabilityRecord, "notes"> {
    id: string;              // alias for availability_UUID (for PreviewRecord compatibility)
    personnel: string;       // alias for emp_UUID (for dialog compatibility)
    personnel_name: string;  // populated by component
    notes: string;           // override to be non-null for index signature
    // Index signature for PreviewRecord compatibility - all fields are strings
    [key: string]: string;
}

export default function useAvailability() {
    const [records, setRecords] = useState<AvailabilityRecordExtended[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        try {
            setLoading(true);
            setError(null);
            const response = await availability_service.list();
            // Convert backend format to frontend format with all fields + aliases
            // Ensure notes is string (not null) for index signature compatibility
            setRecords(response.items.map((item) => ({
                ...item,
                id: item.availability_UUID,
                personnel: item.emp_UUID,
                personnel_name: "", // Will be populated by the component
                notes: item.notes ?? "",
            })));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load availability");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    return { records, loading, error, refresh: load };
}
