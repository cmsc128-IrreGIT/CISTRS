import StatusBadge, {
    type StatusTone,
} from "../../../shared/components/ui/status_badge";

const status_tones: Record<string, StatusTone> = {
    completed: "success",
    delayed: "warning",
    cancelled: "danger",
};

export default function LogbookStatusBadge({ status }: { status: string }) {
    const normalized = status.trim().toLowerCase();
    return (
        <StatusBadge tone={status_tones[normalized] ?? "neutral"}>
            {status}
        </StatusBadge>
    );
}