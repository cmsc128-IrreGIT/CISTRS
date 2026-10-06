import type { ReactNode } from "react";

type PageHeaderProps = {
    title: string;
    title_id: string;
    description?: string;
    actions?: ReactNode;
};

export default function PageHeader({
    title,
    title_id,
    description,
    actions,
}: PageHeaderProps) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
                <h1 id={title_id} className="break-words text-2xl font-bold text-slate-900">
                    {title}
                </h1>
                {description && (
                    <p className="mt-1 text-sm text-slate-600">
                        {description}
                    </p>
                )}
            </div>

            {actions && (
                <div className="flex flex-wrap items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}