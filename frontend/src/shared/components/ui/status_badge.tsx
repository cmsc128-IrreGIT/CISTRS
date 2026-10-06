import type { ReactNode } from "react";

type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

const tone_styles: Record<StatusTone, string> = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-900",
    danger: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
};

type StatusBadgeProps = {
    children: ReactNode;
    tone?: StatusTone;
};

export default function StatusBadge({
    children,
    tone = "neutral",
}: StatusBadgeProps) {
    return (
        <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${tone_styles[tone]}`}>
            {children}
        </span>
    );
}