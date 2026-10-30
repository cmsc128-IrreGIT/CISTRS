import { createPortal } from "react-dom";

type ConfirmationModalProps = {
    is_open: boolean;
    title: string;
    message: React.ReactNode;
    confirm_label?: string;
    on_confirm: () => void;
    on_cancel: () => void;
};

export default function ConfirmationModal({
    is_open,
    title,
    message,
    confirm_label = "Confirm",
    on_confirm,
    on_cancel,
}: ConfirmationModalProps) {
    if (!is_open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirmation_title"
                aria-describedby="confirmation_message"
                className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            >
                <h2
                    id="confirmation_title"
                    className="text-lg font-semibold text-slate-900"
                >
                    {title}
                </h2>

                <p
                    id="confirmation_message"
                    className="mt-2 text-sm text-slate-600"
                >
                    {message}
                </p>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={on_cancel}
                        className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={on_confirm}
                        className="min-h-11 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
                    >
                        {confirm_label}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
