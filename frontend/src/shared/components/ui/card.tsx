import type { ReactNode } from "react";

type CardProps = {
    children: ReactNode;
    title?: string;
    action?: ReactNode;
    className?: string;
};

export default function Card({
    children,
    title,
    action,
    className = "",
}: CardProps) {
    return (
        <div
            className={`rounded-xl border border-slate-200 bg-white ${className}`}
        >
            {(title || action) && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                    {title && (
                        <h2 className="text-base font-semibold text-slate-900">
                            {title}
                        </h2>
                    )}
                    {action}
                </div>
            )}

            <div className="p-5 md:p-6">{children}</div>
        </div>
    );
}
