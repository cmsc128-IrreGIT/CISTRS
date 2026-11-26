import { useId } from "react";
import { createPortal } from "react-dom";

type ConfirmationModalProps = {
    is_open: boolean;
    title: string;
    message: React.ReactNode;
    confirm_label?: string;
    confirm_tone?: "danger" | "success";
    reminder?: string;
    on_confirm: () => void;
    on_cancel: () => void;
};

export default function ConfirmationModal({
    is_open,
    title,
    message,
    confirm_label = "Confirm",
    confirm_tone = "danger",
    reminder,
    on_confirm,
    on_cancel,
}: ConfirmationModalProps) {
    const id = useId();
    if (!is_open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={`${id}-title`}
                aria-describedby={
                    reminder ? `${id}-message ${id}-reminder` : `${id}-message`
                }
                className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            >
                <h2
                    id={`${id}-title`}
                    className="text-lg font-semibold text-slate-900"
                >
                    {title}
                </h2>

                <p id={`${id}-message`} className="mt-2 text-sm text-slate-600">
                    {message}
                </p>

                {reminder && (
                    <p
                        id={`${id}-reminder`}
                        className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-700"
                    >
                        <strong className="font-semibold">Reminder</strong>{" "}
                        {reminder}
                    </p>
                )}

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={on_cancel}
                        className="mr-auto min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={on_confirm}
                        className={`min-h-11 rounded-lg px-4 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 ${confirm_tone === "success" ? "bg-emerald-700 hover:bg-emerald-800 focus-visible:outline-emerald-700" : "bg-red-600 hover:bg-red-700 focus-visible:outline-red-600"}`}
                    >
                        {confirm_label}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
