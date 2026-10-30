import type { LucideIcon } from "lucide-react";
import Card from "../../../shared/components/ui/card";

type DashboardSummary = {
    label: string;
    value: number | string;
    description: string;
    icon: LucideIcon;
};

export default function DashboardOverview({
    summaries,
}: {
    summaries: DashboardSummary[];
}) {
    return (
        <Card compact title="Overview">
            <div className="grid gap-px overflow-hidden rounded-lg bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
                {summaries.map(({ label, value, description, icon: Icon }) => (
                    <section key={label} className="bg-white p-3">
                        <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#eaf0ff] text-[#1d4ed8]">
                                <Icon size={18} aria-hidden="true" />
                            </span>
                            <h2 className="text-sm font-medium text-[#526273]">
                                {label}
                            </h2>
                        </div>
                        <div className="mt-2">
                            <p
                                className={`${typeof value === "number" ? "text-3xl font-bold" : "text-base font-medium"} leading-tight text-[#0b2238]`}
                            >
                                {value === "Loading…" ? (
                                    <span
                                        role="status"
                                        aria-label={`Loading ${label.toLowerCase()}`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="block h-8 w-16 rounded bg-slate-200 motion-safe:animate-pulse"
                                        />
                                        <span className="sr-only">
                                            Loading…
                                        </span>
                                    </span>
                                ) : (
                                    value
                                )}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                {description}
                            </p>
                        </div>
                    </section>
                ))}
            </div>
        </Card>
    );
}
