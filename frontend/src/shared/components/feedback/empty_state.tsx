import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
    title: string;
    description?: string;
    icon?: LucideIcon;
    action?: ReactNode;
};

export default function EmptyState({
    title,
    description,
    icon: Icon,
    action,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center px-4 py-12 text-center">
            {Icon && (
                <div className="mb-4 rounded-full bg-slate-100 p-4">
                    <Icon
                        size={28}
                        className="text-slate-500"
                        aria-hidden="true"
                    />
                </div>
            )}

            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>

            {description && (
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                    {description}
                </p>
            )}

            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
