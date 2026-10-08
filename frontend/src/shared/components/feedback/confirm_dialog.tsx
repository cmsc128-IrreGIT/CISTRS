import { useEffect, useId, useRef } from "react";

type ConfirmDialogProps = {
    is_open: boolean;
    title: string;
    message: string;
    confirm_text?: string;
    is_pending?: boolean;
    on_confirm: () => void;
    on_cancel: () => void;
};

export default function ConfirmDialog({
    is_open,
    title,
    message,
    confirm_text = "Confirm",
    is_pending = false,
    on_confirm,
    on_cancel,
}: ConfirmDialogProps) {
    const dialog_ref = useRef<HTMLDialogElement>(null);
    const title_id = useId();
    const message_id = useId();

    useEffect(() => {
        const dialog = dialog_ref.current;
        if (!dialog) return;

        if (is_open && !dialog.open) dialog.showModal();
        if (!is_open && dialog.open) dialog.close();
    }, [is_open]);

    return (
        <dialog
            ref={dialog_ref}
            aria-labelledby={title_id}
            aria-describedby={message_id}
            aria-busy={is_pending}
            onCancel={(event) => {
                event.preventDefault();
                if (!is_pending) on_cancel();
            }}
            className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-black/50"
        >
            <h2 id={title_id} className="text-xl font-bold">
                {title}
            </h2>

            <p
                id={message_id}
                className="mt-3 text-sm leading-6 text-slate-600"
            >
                {message}
            </p>

            <div className="mt-6 flex justify-end gap-3">
                <button
                    type="button"
                    autoFocus
                    disabled={is_pending}
                    onClick={on_cancel}
                    className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    disabled={is_pending}
                    onClick={() => {
                        if (!is_pending) on_confirm();
                    }}
                    className="min-h-11 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {is_pending ? "Please wait…" : confirm_text}
                </button>
            </div>
        </dialog>
    );
}
