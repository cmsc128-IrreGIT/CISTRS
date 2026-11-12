import { Fragment } from "react";
import { Link } from "react-router";

export default function WorkspaceBreadcrumbs({
    current,
    parents = [],
}: {
    current: string;
    parents?: { label: string; to?: string }[];
}) {
    return (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-[#0b2238]">
            <Link to="/dashboard" className="underline underline-offset-2">Dashboard</Link>
            {parents.map(({ label, to }) => (
                <Fragment key={label}>
                    <span aria-hidden="true">›</span>
                    {to ? (
                        <Link to={to} className="wrap-anywhere underline underline-offset-2">{label}</Link>
                    ) : (
                        <span className="wrap-anywhere">{label}</span>
                    )}
                </Fragment>
            ))}
            <span aria-hidden="true">›</span>
            <span aria-current="page" className="wrap-anywhere font-semibold">{current}</span>
        </nav>
    );
}
