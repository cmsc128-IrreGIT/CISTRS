import type { ReactNode } from "react";

export type DetailEntry = {
    id: string;
    label: string;
    value: ReactNode;
};

type DetailsListProps = {
    entries: DetailEntry[];
};

export default function DetailsList({ entries }: DetailsListProps) {
    return (
        <dl className="grid gap-5 sm:grid-cols-2">
            {entries.map(({ id, label, value }) => (
                <div key={id}>
                    <dt className="text-sm text-slate-500">{label}</dt>
                    <dd className="mt-1 break-words font-medium text-slate-900">
                        {value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}