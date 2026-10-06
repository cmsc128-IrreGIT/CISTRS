import { Search, X } from "lucide-react";
import { useId } from "react";

type SearchInputProps = {
    value: string;
    on_change: (value: string) => void;
    label?: string;
    placeholder?: string;
    className?: string;
};

export default function SearchInput({
    value,
    on_change,
    label = "Search records",
    placeholder = "Search...",
    className = "",
}: SearchInputProps) {
    const input_id = useId();

    return (
        <div className={`relative ${className}`}>
            <label htmlFor={input_id} className="sr-only">
                {label}
            </label>

            <Search
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
                id={input_id}
                type="search"
                value={value}
                onChange={(event) => on_change(event.currentTarget.value)}
                placeholder={placeholder}
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-red-600 [&::-webkit-search-cancel-button]:appearance-none"
            />

            {value && (
                <button
                    type="button"
                    onClick={() => {
                        on_change("");
                        document.getElementById(input_id)?.focus();
                    }}
                    aria-label={`Clear ${label.toLowerCase()}`}
                    className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-600"
                >
                    <X size={16} aria-hidden="true" />
                </button>
            )}
        </div>
    );
}