import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router";

export default function WorkspaceTabs({
    label,
    children,
    className = "mb-4",
}: {
    label: string;
    children: ReactNode;
    className?: string;
}) {
    const ref = useRef<HTMLElement>(null);
    const { pathname, search } = useLocation();

    useLayoutEffect(() => {
        const nav = ref.current;
        const active = nav?.querySelector('[aria-current="page"]');
        if (!nav || !active) return;

        const reveal_active = () => {
            const viewport = nav.getBoundingClientRect();
            const tab = active.getBoundingClientRect();
            if (tab.left < viewport.left || tab.right > viewport.right) {
                nav.scrollLeft +=
                    tab.left -
                    viewport.left -
                    (nav.clientWidth - tab.width) / 2;
            }
        };

        reveal_active();
        if (typeof ResizeObserver === "undefined") return;
        const resize = new ResizeObserver(reveal_active);
        resize.observe(nav);
        return () => resize.disconnect();
    }, [pathname, search]);

    return (
        <nav
            ref={ref}
            aria-label={label}
            className={`thin-scrollbar flex min-w-0 max-w-full gap-1 overflow-x-auto overscroll-x-contain border-b border-slate-200 ${className}`}
        >
            {children}
        </nav>
    );
}
