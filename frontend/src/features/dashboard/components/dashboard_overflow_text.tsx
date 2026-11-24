import { useEffect, useRef } from "react";

export default function DashboardOverflowText({
    text,
    className = "",
}: {
    text: string;
    className?: string;
}) {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const update = () => {
            element.classList.toggle(
                "dashboard-text-overflow",
                element.scrollWidth > element.clientWidth,
            );
        };

        update();
        if (typeof ResizeObserver === "undefined") return;

        const observer = new ResizeObserver(update);
        observer.observe(element);
        return () => observer.disconnect();
    }, [text]);

    return (
        <span
            ref={ref}
            className={`block overflow-hidden whitespace-nowrap ${className}`}
        >
            {text}
        </span>
    );
}
