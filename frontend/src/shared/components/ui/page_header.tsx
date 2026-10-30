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
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
            <div className="min-w-0 max-w-2xl">
                <h1
                    id={title_id}
                    className="break-words text-2xl font-bold tracking-tight text-[#0b2238]"
                >
                    {title}
                </h1>
                {description && (
                    <p className="mt-1 text-sm text-slate-600">{description}</p>
                )}
            </div>

            {actions && (
                <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}
