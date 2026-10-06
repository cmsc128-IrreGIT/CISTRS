import { Bell, LayoutDashboard, Menu, Package, X } from "lucide-react";
import { useRef } from "react";
import { Link, NavLink } from "react-router";
import NavigationLinks from "./navigation_links";

const mobile_links = [
    { to: "/dashboard", label: "Home", icon: LayoutDashboard },
    { to: "/inventory", label: "Inventory", icon: Package },
    { to: "/notifications", label: "Alerts", icon: Bell },
];

export default function MobileNavbar() {
    const menu_ref = useRef<HTMLDialogElement>(null);

    function close_menu() {
        menu_ref.current?.close();
    }

    return (
        <>
            <nav
                aria-label="Mobile navigation"
                className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur-md md:hidden"
            >
                <div className="flex gap-1">
                    {mobile_links.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium ${
                                    isActive
                                        ? "bg-red-50 text-red-700"
                                        : "text-slate-600 hover:bg-slate-100"
                                }`
                            }
                        >
                            <Icon size={21} aria-hidden="true" />
                            <span>{label}</span>
                        </NavLink>
                    ))}

                    <button
                        type="button"
                        onClick={() => menu_ref.current?.showModal()}
                        aria-haspopup="dialog"
                        aria-controls="mobile_menu"
                        className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                        <Menu size={21} aria-hidden="true" />
                        <span>More</span>
                    </button>
                </div>
            </nav>

            <dialog
                ref={menu_ref}
                id="mobile_menu"
                aria-labelledby="mobile_menu_title"
                className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl bg-[#0b2238] p-4 text-white shadow-xl backdrop:bg-black/50"
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 id="mobile_menu_title" className="text-lg font-bold">
                        CISTRS Navigation
                    </h2>
                    <button
                        type="button"
                        autoFocus
                        onClick={close_menu}
                        aria-label="Close navigation"
                        className="flex size-11 items-center justify-center rounded-lg hover:bg-white/10"
                    >
                        <X size={22} aria-hidden="true" />
                    </button>
                </div>

                <nav aria-label="All features" className="flex flex-col gap-1">
                    <NavigationLinks on_navigate={close_menu} />
                </nav>

                <Link
                    to="/login"
                    onClick={close_menu}
                    className="mt-4 block rounded-lg px-3 py-3 text-sm text-slate-300 hover:bg-white/10"
                >
                    Login preview
                </Link>
            </dialog>
        </>
    );
}
