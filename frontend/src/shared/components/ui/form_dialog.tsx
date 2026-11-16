import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
export default function FormDialog({
    title,
    children,
    on_close,
    compact = false,
    close_label = "Close form",
    is_busy = false,
}: {
    title: string;
    children: ReactNode;
    on_close: () => void;
    compact?: boolean;
    close_label?: string;
    is_busy?: boolean;
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
                if (!is_busy) on_close();
            }}
            aria-busy={is_busy || undefined}
            className={`fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-white p-0 text-[#172b3a] shadow-xl ${compact ? "max-w-xl backdrop:bg-[#0b2238]/50" : "max-w-3xl backdrop:bg-[#0b2238]/65"}`}
        >
            <header className={`sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white ${compact ? "px-4 py-2 sm:px-5" : "px-5 py-3 sm:px-7"}`}>
                <h2 id={id} className="text-xl font-semibold">
                    {title}
                </h2>
                <button
                    type="button"
                    aria-label={close_label}
                    onClick={on_close}
                    disabled={is_busy}
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#1d4ed8]"
                >
                    <X size={20} aria-hidden="true" />
                </button>
            </header>
            <div className={compact ? undefined : "p-5 sm:p-7"}>{children}</div>
        </dialog>
    );
}
