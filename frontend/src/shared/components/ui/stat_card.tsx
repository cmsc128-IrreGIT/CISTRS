import type { LucideIcon } from "lucide-react";
import Card from "./card";

type StatCardProps = {
    label: string;
    value: number | string;
    description: string;
    icon: LucideIcon;
};

export default function StatCard({
    label,
    value,
    description,
    icon: Icon,
}: StatCardProps) {
    return (
        <Card>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-medium text-slate-600">
                        {label}
                    </h2>
                    <p className="mt-2 text-3xl font-bold text-[#0b2238]">
                        {value}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                        {description}
                    </p>
                </div>

                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#0b2238]">
                    <Icon size={22} aria-hidden="true" />
                </span>
            </div>
        </Card>
    );
}