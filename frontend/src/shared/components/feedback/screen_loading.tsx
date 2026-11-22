export default function ScreenLoading({
    label = "Loading page…",
    compact = false,
}: {
    label?: string;
    compact?: boolean;
}) {
    return (
        <div role="status" aria-label={label} className="space-y-4">
            <span className="sr-only">{label}</span>
            <div
                aria-hidden="true"
                className="space-y-4 motion-safe:animate-pulse"
            >
                {!compact && (
                    <>
                        <div className="h-7 w-48 rounded bg-slate-200" />
                        <div className="h-4 w-64 max-w-full rounded bg-slate-200" />
                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                            {[0, 1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="h-24 rounded-xl border border-slate-200 bg-white p-4"
                                >
                                    <div className="h-3 w-3/4 rounded bg-slate-200" />
                                    <div className="mt-4 h-6 w-1/3 rounded bg-slate-200" />
                                </div>
                            ))}
                        </div>
                    </>
                )}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="my-3 h-8 rounded bg-slate-100"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
