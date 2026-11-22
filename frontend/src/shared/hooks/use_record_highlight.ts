import { useCallback, useRef } from "react";
import { useLocation } from "react-router";

export default function useRecordHighlight() {
    const { hash, state, key } = useLocation();
    const shown = useRef<string>(undefined);
    const previous_id = typeof state?.highlight_record === "string" ? state.highlight_record : undefined;
    const id = new URLSearchParams(hash.slice(1)).get("record") || previous_id;

    const ref = useCallback((element: HTMLElement | null) => {
        if (!element || shown.current === key) return;
        let timer: number | undefined;
        const frame = window.requestAnimationFrame(() => {
            shown.current = key;
            element.classList.add("record-highlight");
            element.scrollIntoView?.({ block: "center", inline: "nearest" });
            timer = window.setTimeout(() => element.classList.remove("record-highlight"), 4000);
        });

        return () => {
            window.cancelAnimationFrame(frame);
            window.clearTimeout(timer);
            element.classList.remove("record-highlight");
        };
    }, [key]);

    return id ? { id, ref } : undefined;
}
