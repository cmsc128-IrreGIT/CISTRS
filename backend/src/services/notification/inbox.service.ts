import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpError.js";
import { prisma } from "../../lib/prisma.js";
import type { CATEGORIES } from "./shared.js";

type Category = (typeof CATEGORIES)[number];

const inboxSelect = {
    recipient_UUID: true,
    read_at: true,
    created_at: true,
    notification: {
        select: {
            notification_UUID: true,
            title: true,
            message: true,
            severity: true,
            created_at: true,
            type: { select: { event_code: true, category: true } },
        },
    },
} satisfies Prisma.NotificationRecipientSelect;

// The person's own notifications, newest first.
export async function listInbox(
    empUUID: string,
    options: {
        category?: Category | undefined;
        unreadOnly: boolean;
        page: number;
        limit: number;
    },
) {
    const where: Prisma.NotificationRecipientWhereInput = {
        emp_UUID: empUUID,
        ...(options.unreadOnly ? { read_at: null } : {}),
        ...(options.category
            ? { notification: { type: { category: options.category } } }
            : {}),
    };

    const [rows, total, unread_count] = await Promise.all([
        prisma.notificationRecipient.findMany({
            where,
            select: inboxSelect,
            orderBy: { created_at: "desc" },
            skip: (options.page - 1) * options.limit,
            take: options.limit,
        }),
        prisma.notificationRecipient.count({ where }),
        prisma.notificationRecipient.count({
            where: { emp_UUID: empUUID, read_at: null },
        }),
    ]);

    return {
        items: rows.map((row) => ({
            recipient_UUID: row.recipient_UUID,
            notification_UUID: row.notification.notification_UUID,
            title: row.notification.title,
            message: row.notification.message,
            severity: row.notification.severity,
            category: row.notification.type.category,
            event_code: row.notification.type.event_code,
            created_at: row.notification.created_at,
            read_at: row.read_at,
            is_read: row.read_at !== null,
        })),
        total,
        unread_count,
        page: options.page,
        limit: options.limit,
    };
}

export async function getUnreadCount(empUUID: string): Promise<number> {
    return prisma.notificationRecipient.count({
        where: { emp_UUID: empUUID, read_at: null },
    });
}

// Marks ONE notification as read. Only the owner of the row can do this.
export async function markRead(empUUID: string, recipientUUID: string) {
    const row = await prisma.notificationRecipient.findFirst({
        where: { recipient_UUID: recipientUUID, emp_UUID: empUUID },
        select: { read_at: true },
    });

    if (!row) throw new HttpError(404, "Notification not found");

    if (!row.read_at) {
        await prisma.notificationRecipient.update({
            where: { recipient_UUID: recipientUUID },
            data: { read_at: new Date() },
        });
    }

    return { recipient_UUID: recipientUUID, is_read: true };
}

// Marks all of the person's unread notifications as read (optionally one category).
export async function markAllRead(empUUID: string, category?: Category) {
    const result = await prisma.notificationRecipient.updateMany({
        where: {
            emp_UUID: empUUID,
            read_at: null,
            ...(category ? { notification: { type: { category } } } : {}),
        },
        data: { read_at: new Date() },
    });

    return { updated: result.count };
}
