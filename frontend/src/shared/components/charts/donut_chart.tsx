export type DonutChartEntry = { label: string; value: number; color: string };
type DonutChartProps = {
    data: DonutChartEntry[];
    label: string;
    compact?: boolean;
};
export default function DonutChart({
    data,
    label,
    compact = false,
}: DonutChartProps) {
    const total = data.reduce((sum, entry) => sum + entry.value, 0);
    const circumference = 2 * Math.PI * 44;
    const segments = data.map((entry, index) => {
        const length = total > 0 ? (entry.value / total) * circumference : 0;
        const previous = data
            .slice(0, index)
            .reduce((sum, item) => sum + item.value, 0);
        const offset = total > 0 ? -(previous / total) * circumference : 0;
        return { ...entry, length, offset };
    });
    return (
        <figure
            aria-label={label}
            className={
                compact
                    ? "grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3"
                    : "space-y-4"
            }
        >
            <div
                className={`relative mx-auto ${compact ? "size-24" : "size-44"}`}
            >
                <svg
                    viewBox="0 0 120 120"
                    className="block h-full w-full"
                    aria-hidden="true"
                >
                    <circle
                        cx="60"
                        cy="60"
                        r="44"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="14"
                    />
                    {segments
                        .filter((entry) => entry.value > 0)
                        .map((entry) => (
                            <circle
                                key={entry.label}
                                cx="60"
                                cy="60"
                                r="44"
                                fill="none"
                                stroke={entry.color}
                                strokeWidth="14"
                                strokeDasharray={`${entry.length} ${circumference - entry.length}`}
                                strokeDashoffset={entry.offset}
                                transform="rotate(-90 60 60)"
                            />
                        ))}
                </svg>
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
                >
                    <span className="text-2xl font-bold text-[#0b2238]">
                        {total}
                    </span>
                    {!compact && (
                        <span className="text-xs text-slate-500">Total</span>
                    )}
                </div>
            </div>
            <figcaption>
                <ul className="space-y-2">
                    {data.map(({ label, value, color }) => (
                        <li
                            key={label}
                            className={`flex items-center gap-2 text-slate-600 ${compact ? "text-xs" : "text-sm"}`}
                        >
                            <span
                                aria-hidden="true"
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: color }}
                            />
                            <span className="flex-1">{label}</span>
                            <span className="font-semibold tabular-nums text-slate-900">
                                {value}
                            </span>
                        </li>
                    ))}
                </ul>
            </figcaption>
        </figure>
    );
}
