import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import ConfirmDialog from "../feedback/confirm_dialog";

type ProfileMenuProps = {
    display_name: string;
    role: string;
    email?: string;
    on_logout?: () => Promise<void>;
};

export default function ProfileMenu({
    display_name,
    role,
    email,
    on_logout,
}: ProfileMenuProps) {
    const [open, set_open] = useState(false);
    const [show_logout_dialog, set_show_logout_dialog] = useState(false);
    const [is_pending, set_is_pending] = useState(false);
    const container_ref = useRef<HTMLDivElement>(null);
    const trigger_ref = useRef<HTMLButtonElement>(null);
    const logout_pending_ref = useRef(false);
    const panel_id = useId();

    const initials =
        display_name
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase() || "?";

    useEffect(() => {
        if (!open) return;

        function handle_pointer(event: PointerEvent) {
            if (
                event.target instanceof Node &&
                !container_ref.current?.contains(event.target)
            ) {
                set_open(false);
            }
        }

        function handle_key(event: KeyboardEvent) {
            if (event.key === "Escape") {
                set_open(false);
                trigger_ref.current?.focus();
            }
        }

        document.addEventListener("pointerdown", handle_pointer);
        document.addEventListener("keydown", handle_key);

        return () => {
            document.removeEventListener("pointerdown", handle_pointer);
            document.removeEventListener("keydown", handle_key);
        };
    }, [open]);

    async function handle_logout() {
        if (!on_logout || logout_pending_ref.current) return;

        logout_pending_ref.current = true;
        set_is_pending(true);

        try {
            await on_logout();
            set_show_logout_dialog(false);
        } catch {
            toast.error("Could not log out. Please try again.");
        } finally {
            logout_pending_ref.current = false;
            set_is_pending(false);
        }
    }

    const link_style =
        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-red-600";

    return (
        <>
            <div
                ref={container_ref}
                className="relative"
                onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                        set_open(false);
                    }
                }}
            >
                <button
                    ref={trigger_ref}
                    type="button"
                    onClick={() => set_open((previous) => !previous)}
                    aria-label={`Profile options for ${display_name}`}
                    aria-expanded={open}
                    aria-controls={panel_id}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-red-600"
                >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-sm font-semibold text-red-700">
                        {initials}
                    </span>

                    <span className="hidden max-w-40 text-left sm:block">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                            {display_name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                            {role}
                        </span>
                    </span>

                    <ChevronDown size={16} aria-hidden="true" />
                </button>

                {open && (
                    <div
                        id={panel_id}
                        className="absolute right-0 z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                    >
                        <div className="border-b border-slate-100 px-4 py-3">
                            <p className="truncate text-sm font-semibold text-slate-900">
                                {display_name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {role}
                            </p>
                            {email && (
                                <p className="mt-1 truncate text-xs text-slate-500">
                                    {email}
                                </p>
                            )}
                        </div>

                        <div className="p-2">
                            <Link
                                to="/profile"
                                onClick={() => set_open(false)}
                                className={link_style}
                            >
                                <User size={18} aria-hidden="true" />
                                Profile
                            </Link>

                            <Link
                                to="/settings"
                                onClick={() => set_open(false)}
                                className={link_style}
                            >
                                <Settings size={18} aria-hidden="true" />
                                Settings
                            </Link>
                        </div>

                        <div className="border-t border-slate-100 p-2">
                            <button
                                type="button"
                                disabled={!on_logout}
                                onClick={() => {
                                    set_open(false);
                                    set_show_logout_dialog(true);
                                }}
                                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <LogOut size={18} aria-hidden="true" />
                                Log out
                            </button>

                            {!on_logout && (
                                <p className="px-3 pb-2 text-xs text-slate-500">
                                    Logout is unavailable in this preview.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmDialog
                is_open={show_logout_dialog}
                title="Log out?"
                message="Are you sure you want to log out of CISTRS?"
                confirm_text="Log out"
                is_pending={is_pending}
                on_confirm={() => {
                    void handle_logout();
                }}
                on_cancel={() => set_show_logout_dialog(false)}
            />
        </>
    );
}
