import StatusBadge from "../../../shared/components/ui/status_badge";

export default function PersonnelStatus({
    status,
    availability = false,
}: {
    status?: string;
    availability?: boolean;
}) {
    const label = status || "Not recorded";
    const tone = availability
        ? label === "Available"
            ? "success"
            : label === "Unavailable"
              ? "warning"
              : "neutral"
        : label === "Active"
          ? "success"
          : "neutral";
    return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
