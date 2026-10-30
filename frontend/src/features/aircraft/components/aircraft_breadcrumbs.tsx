import { ChevronRight } from "lucide-react";
import { Link } from "react-router";

export default function AircraftBreadcrumbs({
    registration,
}: {
    registration?: string;
}) {
    return (
        <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500"
        >
            <Link
                to="/dashboard"
                className="rounded-sm hover:text-[#0b2238] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8]"
            >
                Dashboard
            </Link>
            <ChevronRight
                size={15}
                aria-hidden="true"
                className="text-slate-400"
            />
            {registration ? (
                <>
                    <Link
                        to="/aircraft"
                        className="rounded-sm hover:text-[#0b2238] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8]"
                    >
                        Aircraft
                    </Link>
                    <ChevronRight
                        size={15}
                        aria-hidden="true"
                        className="text-slate-400"
                    />
                    <span
                        aria-current="page"
                        className="font-medium text-slate-700"
                    >
                        {registration}
                    </span>
                </>
            ) : (
                <span
                    aria-current="page"
                    className="font-medium text-slate-700"
                >
                    Aircraft
                </span>
            )}
        </nav>
    );
}
