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
            className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-link"
        >
            <ArrowLeft size={18} aria-hidden="true" />
            {label}
        </Link>
    );
}
