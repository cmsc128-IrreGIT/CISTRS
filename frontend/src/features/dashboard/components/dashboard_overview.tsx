import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import DashboardOverflowText from "./dashboard_overflow_text";
import DashboardPanel from "./dashboard_panel";

export type DashboardSummary = {
    label: string;
    value?: ReactNode;
    icon: LucideIcon;
    to?: string;
    tone?: "warning" | "danger";
    hint?: string;
};

const tones = {
    neutral: "border-[#dbe3ed] text-[#0b2238]",
    warning: "border-[#ba7a23] bg-[#fff5dd] text-[#855000]",
    danger: "border-[#e35860] bg-[#feedef] text-[#a81820]",
};

const today_format = new Intl.DateTimeFormat("en-GB", { dateStyle: "full" });

export default function DashboardOverview({
    summaries,
    today,
}: {
    summaries: DashboardSummary[];
    today: Date;
}) {
    return (
        <DashboardPanel
            title="Overview"
            className="dashboard-overview"
            header_end={
                <time
                    dateTime={new Date(
                        today.getTime() - today.getTimezoneOffset() * 60_000,
                    )
                        .toISOString()
                        .slice(0, 10)}
                    className="text-right text-xs text-slate-600"
                >
                    {today_format.format(today)}
                </time>
            }
        >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8.5rem),1fr))] gap-3">
                {summaries.map(
                    ({ label, value, icon: Icon, to, tone, hint }) => {
                        const className = `flex min-h-16 min-w-0 flex-col justify-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-medium ${tones[tone ?? "neutral"]}`;
                        const has_count = typeof value === "number";
                        const content = (
                            <>
                                <div className="flex min-w-0 items-center gap-2">
                                    <span
                                        className={`grid size-6 shrink-0 place-items-center rounded-md ${tone ? "" : "bg-[#e9f0f8]"}`}
                                    >
                                        <Icon size={16} aria-hidden="true" />
                                    </span>
                                    <DashboardOverflowText
                                        text={label}
                                        className="min-w-0 flex-1"
                                    />
                                    {has_count && (
                                        <span className="shrink-0 text-2xl leading-none font-bold tabular-nums">
                                            {value}
                                        </span>
                                    )}
                                    {to && (
                                        <ChevronRight
                                            size={12}
                                            className="shrink-0"
                                            aria-hidden="true"
                                        />
                                    )}
                                </div>
                                {!has_count && value != null && (
                                    <div>{value}</div>
                                )}
                            </>
                        );
                        const title = hint ? `${label} · ${hint}` : label;
                        return to ? (
                            <Link
                                key={label}
                                to={to}
                                title={title}
                                className={`${className} hover:brightness-95`}
                            >
                                {content}
                            </Link>
                        ) : (
                            <div
                                key={label}
                                title={title}
                                className={className}
                            >
                                {content}
                            </div>
                        );
                    },
                )}
            </div>
        </DashboardPanel>
    );
}
