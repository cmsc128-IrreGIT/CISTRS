import type { ReactNode } from "react";
import { Link } from "react-router";

export default function DashboardPanel({
  title,
  children,
  footer,
  className = "",
  sample = false,
}: {
  title: string;
  children: ReactNode;
  footer?: { label: string; to?: string };
  className?: string;
  sample?: boolean;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-xl border border-[#dbe3ed] bg-white p-3.5 ${className}`}
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2 border-b border-[#dbe3ed] pb-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {sample && <span className="text-xs text-slate-500">Sample data</span>}
      </div>
      <div className="flex-1">{children}</div>
      {footer && (
        <div className="mt-3">
          {footer.to ? (
            <Link
              to={footer.to}
              className="dashboard-footer hover:border-slate-400 hover:bg-slate-50"
            >
              {footer.label}
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="dashboard-footer text-slate-500"
            >
              {footer.label}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
