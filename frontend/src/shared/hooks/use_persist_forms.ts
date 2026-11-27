import {
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import type { SetStateAction, SyntheticEvent } from "react";
import { AuthContext } from "../../features/auth/hooks/auth_context";

type Options<T> = {
    storage?: "local" | "session";
    version?: number;
    ttlMs?: number;
    omit?: (keyof T)[];
    debounceMs?: number;
};

const noOmissions: never[] = [];

type Stored<T> = { v: number; savedAt: number; data: Partial<T> };

const getStore = (kind: "local" | "session") =>
    typeof window === "undefined"
        ? null
        : kind === "session"
          ? window.sessionStorage
          : window.localStorage;

function useFormDraftKey(key: string) {
    const account = useContext(AuthContext)?.user?.account_UUID;
    return `form-draft:${account ?? "anonymous"}:${key}`;
}

function removeDraft(fullKey: string, storage: "local" | "session") {
    try {
        getStore(storage)?.removeItem(fullKey);
    } catch (error) {
        console.warn("Could not remove the saved form draft.", error);
    }
}

export function useDiscardFormDraft(
    key: string,
    storage: "local" | "session" = "local",
) {
    const fullKey = useFormDraftKey(key);
    return () => removeDraft(fullKey, storage);
}

function withoutFields<T extends object>(state: Partial<T>, omit: (keyof T)[]) {
    const data: Partial<T> = { ...state };
    for (const key of omit) delete data[key];
    return data;
}

export function usePersistedForm<T extends object>(
    key: string,
    initial: T,
    {
        storage = "local",
        version = 1,
        ttlMs = 14 * 24 * 60 * 60 * 1000, // 14 days persistence
        omit = noOmissions,
        debounceMs = 300,
    }: Options<T> = {},
) {
    const fullKey = useFormDraftKey(key);
    const pending = useRef<(() => void) | null>(null);
    const [draft, setDraft] = useState(() => {
        try {
            const store = getStore(storage);
            const raw = store?.getItem(fullKey);
            if (raw) {
                const parsed: Stored<T> = JSON.parse(raw);
                if (
                    parsed.v === version &&
                    Date.now() - parsed.savedAt <= ttlMs
                ) {
                    return {
                        state: {
                            ...initial,
                            ...withoutFields(parsed.data, omit),
                        },
                        restored: true,
                        changed: false,
                    };
                }
                store?.removeItem(fullKey);
            }
        } catch (error) {
            console.warn("Could not restore the saved form draft.", error);
        }
        return { state: initial, restored: false, changed: false };
    });

    const setState = useCallback((value: SetStateAction<T>) => {
        setDraft((current) => {
            const state =
                typeof value === "function"
                    ? (value as (previous: T) => T)(current.state)
                    : value;
            return { ...current, state, changed: true };
        });
    }, []);

    useLayoutEffect(() => {
        if (!draft.changed) return;
        const data = withoutFields(draft.state, omit);
        function flush() {
            if (pending.current !== flush) return;
            pending.current = null;
            try {
                const payload: Stored<T> = {
                    v: version,
                    savedAt: Date.now(),
                    data,
                };
                getStore(storage)?.setItem(fullKey, JSON.stringify(payload));
            } catch (error) {
                console.warn("Could not save the form draft.", error);
            }
        }
        pending.current = flush;
        const timer = setTimeout(flush, debounceMs);
        return () => clearTimeout(timer);
    }, [draft, fullKey, storage, version, debounceMs, omit]);

    useEffect(() => {
        const flush = () => pending.current?.();
        window.addEventListener("pagehide", flush);
        return () => {
            window.removeEventListener("pagehide", flush);
            flush();
        };
    }, []);

    const clear = () => {
        pending.current = null;
        removeDraft(fullKey, storage);
        setDraft({ state: initial, restored: false, changed: false });
    };

    return [
        draft.state,
        setState,
        { clear, restored: draft.restored },
    ] as const;
}

export function changedFormField(event: SyntheticEvent<HTMLFormElement>) {
    const field = event.target;
    if (
        (field instanceof HTMLInputElement ||
            field instanceof HTMLSelectElement ||
            field instanceof HTMLTextAreaElement) &&
        field.name &&
        !(field instanceof HTMLInputElement && field.type === "password")
    ) {
        return field;
    }
}
