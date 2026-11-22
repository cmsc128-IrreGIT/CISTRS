import StatusBadge from "../../../shared/components/ui/status_badge";

export default function AccountStatus({ status, preview }: { status: string; preview?: boolean }) {
    return (
        <StatusBadge tone={status === "Active" ? "success" : "neutral"}>
            {status || "Not recorded"}{preview ? " · Preview" : ""}
        </StatusBadge>
    );
}
