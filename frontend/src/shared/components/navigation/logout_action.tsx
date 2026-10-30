import { LogOut } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useAuth } from "../../../features/auth/hooks/auth_context";
import ConfirmDialog from "../feedback/confirm_dialog";

export default function LogoutAction({
    collapsed = false,
    on_request,
}: {
    collapsed?: boolean;
    on_request?: () => void;
}) {
    const { logout } = useAuth();
    const [open, set_open] = useState(false);
    const [pending, set_pending] = useState(false);
    const request = useRef(false);
    async function confirm() {
        if (request.current) return;
        request.current = true;
        set_pending(true);
        try {
            await logout();
            set_open(false);
        } catch {
            toast.error("Could not log out. Please try again.");
        } finally {
            request.current = false;
            set_pending(false);
        }
    }
    return (
        <>
            <button
                type="button"
                title="Log out"
                aria-label="Log out"
                onClick={() => {
                    on_request?.();
                    set_open(true);
                }}
                className={`mt-4 flex min-h-11 w-full shrink-0 items-center rounded-lg text-sm font-medium text-red-400 hover:bg-white/10 hover:text-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 ${collapsed ? "mx-auto max-w-11 justify-center" : "gap-3 px-3"}`}
            >
                <LogOut size={20} aria-hidden="true" />
                {!collapsed && <span>Log out</span>}
            </button>
            {createPortal(
                <ConfirmDialog
                    is_open={open}
                    title="Log out?"
                    message="Are you sure you want to log out of CISTRS?"
                    confirm_text="Log out"
                    is_pending={pending}
                    on_confirm={() => {
                        void confirm();
                    }}
                    on_cancel={() => {
                        if (!request.current) set_open(false);
                    }}
                />,
                document.body,
            )}
        </>
    );
}
