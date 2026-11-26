import StatusBadge from "../../../shared/components/ui/status_badge";
export default function AircraftStatusBadge({ status }: { status?: string }) {
    const label = status?.trim() || "Status unavailable";
    const normalized = label.toLowerCase();
    return (
        <StatusBadge
            tone={
                normalized === "operational" || normalized === "airworthy"
                    ? "success"
                    : normalized.includes("maintenance")
                      ? "warning"
                      : normalized === "aog" ||
                          normalized.includes("out of service") ||
                          normalized.includes("unairworthy")
                        ? "danger"
                        : "neutral"
            }
        >
            {label}
        </StatusBadge>
    );
}
