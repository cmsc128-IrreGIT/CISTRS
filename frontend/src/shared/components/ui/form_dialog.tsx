import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
export default function FormDialog({
    title,
    children,
    on_close,
}: {
    title: string;
    children: ReactNode;
    on_close: () => void;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const id = useId();
    useEffect(() => {
        const dialog = ref.current;
        if (dialog && !dialog.open) dialog.showModal();
        return () => {
            dialog?.close();
        };
    }, []);
    return (
        <dialog
            ref={ref}
            aria-labelledby={id}
            onCancel={(event) => {
                event.preventDefault();
                on_close();
            }}
            className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-xl bg-white p-0 text-[#172b3a] shadow-xl backdrop:bg-[#0b2238]/65"
        >
            <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3 sm:px-7">
                <h2 id={id} className="text-xl font-semibold">
                    {title}
                </h2>
                <button
                    type="button"
                    aria-label="Close form"
                    onClick={on_close}
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#1d4ed8]"
                >
                    <X size={20} aria-hidden="true" />
                </button>
            </header>
            <div className="p-5 sm:p-7">{children}</div>
        </dialog>
    );
}
