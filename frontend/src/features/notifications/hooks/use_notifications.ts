import { useEffect, useState } from "react";
import { notification_service } from "../services/notification_service";
import type {
    NotificationCategory,
    NotificationRecord,
} from "../types/notification_types";

const service = notification_service();

export default function useNotifications() {
    const [version, set_version] = useState(0);
    const [result, set_result] = useState<{
        version: number;
        notifications: NotificationRecord[];
        error: string | null;
    }>();
    useEffect(() => {
        let active = true;
        service
            .list()
            .then((notifications) => {
                if (active) set_result({ version, notifications, error: null });
            })
            .catch((cause: unknown) => {
                if (active)
                    set_result({
                        version,
                        notifications: [],
                        error:
                            cause instanceof Error
                                ? cause.message
                                : "Could not load notifications.",
                    });
            });
        return () => {
            active = false;
        };
    }, [version]);

    async function setRead(id: string, is_read: boolean) {
        await service.set_read(id, is_read);
        set_result(
            (current) =>
                current && {
                    ...current,
                    notifications: current.notifications.map((row) =>
                        row.id === id
                            ? {
                                  ...row,
                                  read_at:
                                      row.read_at ?? new Date().toISOString(),
                              }
                            : row,
                    ),
                },
        );
    }

    async function markAllRead(category?: NotificationCategory) {
        await service.mark_all_read(category);
        const now = new Date().toISOString();
        set_result(
            (current) =>
                current && {
                    ...current,
                    notifications: current.notifications.map((row) =>
                        !row.read_at && (!category || row.category === category)
                            ? { ...row, read_at: now }
                            : row,
                    ),
                },
        );
    }

    const current = result?.version === version ? result : undefined;
    return {
        notifications: current?.notifications ?? [],
        loading: !current,
        error: current?.error ?? null,
        setRead,
        markAllRead,
        refresh: () => set_version((value) => value + 1),
    };
}
