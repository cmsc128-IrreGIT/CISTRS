import type { ReactNode } from "react";

type CardProps = {
    children: ReactNode;
    title?: string;
    action?: ReactNode;
    className?: string;
    compact?: boolean;
};

export default function Card({
    children,
    title,
    action,
    className = "",
    compact = false,
}: CardProps) {
    return (
        <div
            className={`rounded-xl border border-slate-200 bg-white ${className}`}
        >
            {(title || action) && (
                <div
                    className={`flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 ${compact ? "px-4 py-2" : "px-5 py-3"}`}
                >
                    {title && (
                        <h2 className="text-base font-semibold text-slate-900">
                            {title}
                        </h2>
                    )}
                    {action}
                </div>
            )}

            <div className={compact ? "p-3" : "p-4 md:p-5"}>{children}</div>
        </div>
    );
}
