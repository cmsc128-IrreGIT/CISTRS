import StatusBadge from "../../../shared/components/ui/status_badge";

export default function LogbookStatusBadge({ status }: { status: string }) {
    const normalized = status.trim().toLowerCase();
    return <StatusBadge tone={normalized === "completed" ? "success" : normalized === "delayed" ? "warning" : "neutral"}>{status}</StatusBadge>;
}