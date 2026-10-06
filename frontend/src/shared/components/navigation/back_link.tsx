import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

type BackLinkProps = {
    to: string;
    label: string;
};

export default function BackLink({ to, label }: BackLinkProps) {
    return (
        <Link
            to={to}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-slate-600 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
            <ArrowLeft size={18} aria-hidden="true" />
            {label}
        </Link>
    );
}