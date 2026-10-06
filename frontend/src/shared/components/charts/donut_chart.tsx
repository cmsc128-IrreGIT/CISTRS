import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type DonutChartEntry = {
    label: string;
    value: number;
    color: string;
};

type DonutChartProps = {
    data: DonutChartEntry[];
    label: string;
};

export default function DonutChart({ data, label }: DonutChartProps) {
    const chart_data = data.map((entry) => ({
        ...entry,
        fill: entry.color,
    }));
    const total = data.reduce((sum, entry) => sum + entry.value, 0);

    return (
        <figure aria-label={label} className="space-y-4">
            <div className="relative h-44 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chart_data}
                            dataKey="value"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            innerRadius="60%"
                            outerRadius="85%"
                            stroke="#ffffff"
                            strokeWidth={2}
                            isAnimationActive={false}
                        />
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>

                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
                >
                    <span className="text-2xl font-bold text-[#0b2238]">
                        {total}
                    </span>
                    <span className="text-xs text-slate-500">Total</span>
                </div>
            </div>

            <figcaption>
                <ul className="space-y-2">
                    {data.map(({ label, value, color }) => (
                        <li
                            key={label}
                            className="flex items-center gap-2 text-sm text-slate-600"
                        >
                            <span
                                aria-hidden="true"
                                className="size-3 shrink-0 rounded-full"
                                style={{ backgroundColor: color }}
                            />
                            <span className="flex-1">{label}</span>
                            <span className="font-semibold text-slate-900">
                                {value}
                            </span>
                        </li>
                    ))}
                </ul>
            </figcaption>
        </figure>
    );
}