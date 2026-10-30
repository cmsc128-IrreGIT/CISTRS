import { CircleHelp, X } from "lucide-react";
import { useId, useRef } from "react";
export default function FeatureHelp({
    title,
    text,
}: {
    title: string;
    text: string;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const id = useId();

    return (
        <>
            <button
                type="button"
                onClick={() => ref.current?.showModal()}
                aria-label={`Help for ${title}`}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-[#1d4ed8]"
            >
                <CircleHelp size={18} aria-hidden="true" />
            </button>
            <dialog
                ref={ref}
                aria-labelledby={id}
                className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-auto rounded-xl bg-white p-6 text-[#172b3a] shadow-xl backdrop:bg-[#0b2238]/65"
            >
                <div className="flex items-center justify-between gap-4">
                    <h2 id={id} className="text-lg font-semibold">
                        {title} guide
                    </h2>
                    <button
                        type="button"
                        autoFocus
                        aria-label="Close help"
                        onClick={() => ref.current?.close()}
                        className="flex size-11 items-center justify-center rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#1d4ed8]"
                    >
                        <X size={20} />
                    </button>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
            </dialog>
        </>
    );
}
