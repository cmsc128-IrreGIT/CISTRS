import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import DashboardPanel from "./dashboard_panel";

export type DashboardSummary = {
  label: string;
  value: ReactNode;
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

export default function DashboardOverview({
  summaries,
}: {
  summaries: DashboardSummary[];
}) {
  return (
    <DashboardPanel title="Overview" className="dashboard-overview">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10.5rem),1fr))] gap-3">
        {summaries.map(({ label, value, icon: Icon, to, tone, hint }) => {
          const className = `flex min-h-16 min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium ${tones[tone ?? "neutral"]}`;
          const content = (
            <>
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-md ${tone ? "" : "bg-[#e9f0f8]"}`}
              >
                <Icon size={16} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">{label}</span>
              <span
                className={`shrink-0 ${typeof value === "number" ? "text-2xl leading-none font-bold tabular-nums" : ""}`}
              >
                {value}
              </span>
              {to && (
                <ChevronRight
                  size={12}
                  className="shrink-0"
                  aria-hidden="true"
                />
              )}
            </>
          );
          return to ? (
            <Link
              key={label}
              to={to}
              title={hint}
              className={`${className} hover:brightness-95`}
            >
              {content}
            </Link>
          ) : (
            <div key={label} title={hint} className={className}>
              {content}
            </div>
          );
        })}
      </div>
    </DashboardPanel>
  );
}
