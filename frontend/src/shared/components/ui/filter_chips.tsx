import { X } from "lucide-react";

type FilterChipProps = {
    label: string;
    on_remove: () => void;
};

export default function FilterChip({ label, on_remove }: FilterChipProps) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
            {label}

            <button
                type="button"
                onClick={on_remove}
                aria-label={`Remove ${label} filter`}
                className="rounded-full p-0.5 text-slate-500 text-blue-500 hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-600"
            >
                <X size={14} aria-hidden="true" />
            </button>
        </span>
    );
}
