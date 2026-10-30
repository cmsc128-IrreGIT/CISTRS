import StatusBadge from "../../../shared/components/ui/status_badge";
export default function AircraftStatusBadge({ status }: { status?: string }) {
    const label = status?.trim() || "Status unavailable";
    return (
        <StatusBadge
            tone={
                label === "Operational"
                    ? "success"
                    : label === "Maintenance"
                      ? "warning"
                      : label === "Out of Service"
                        ? "danger"
                        : "neutral"
            }
        >
            {label}
        </StatusBadge>
    );
}
