import { useEffect, useState } from "react";
import { notification_service } from "../services/notification_service";
import type { NotificationRecord } from "../types/notification_types";

export default function useNotifications() {
    const [notifications, setNotifications] = useState<NotificationRecord[]>(
        [],
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        try {
            setLoading(true);
            setError(null);
            const service = notification_service();
            const data = await service.list();
            setNotifications(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load notifications",
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let cancelled = false;
        async function runLoad() {
            try {
                setLoading(true);
                setError(null);
                const service = notification_service();
                const data = await service.list();
                if (!cancelled) {
                    setNotifications(data);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load notifications",
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }
        runLoad();
        return () => {
            cancelled = true;
        };
    }, []);

    async function setRead(id: string, isRead: boolean) {
        const service = notification_service();
        await service.set_read(id, isRead);
        setNotifications((prev) =>
            prev.map((n) =>
                n.id === id
                    ? {
                          ...n,
                          read_at: isRead ? new Date().toISOString() : null,
                      }
                    : n,
            ),
        );
    }

    async function markAllRead() {
        const service = notification_service();
        await service.mark_all_read();
        const now = new Date().toISOString();
        setNotifications((prev) =>
            prev.map((n) => (n.read_at === null ? { ...n, read_at: now } : n)),
        );
    }

    return {
        notifications,
        loading,
        error,
        setRead,
        markAllRead,
        refresh: load,
    };
}
