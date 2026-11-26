import { Router, type Request } from "express";
import { z } from "zod";
import { parseOrThrow } from "../lib/validate.js";
import {
    getUnreadCount,
    listInbox,
    markAllRead,
    markRead,
} from "../services/notification/inbox.service.js";
import { CATEGORIES } from "../services/notification/shared.js";

// Mounted in server.ts behind requireAuth + requireFeature(FEATURE.Notifications).
// Every handler reads ONLY the logged-in employee's own rows.
export const notificationsRouter = Router();

function currentEmpUUID(req: Request): string {
    return req.user!.emp_UUID;
}

const listQuerySchema = z.object({
    category: z.enum(CATEGORIES).optional(),
    unread: z.enum(["true", "false"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

const readAllSchema = z.object({
    category: z.enum(CATEGORIES).optional(),
});

const idSchema = z.string().uuid("Invalid notification ID");

// GET /api/notifications?category=Personnel&unread=true&page=1&limit=20
notificationsRouter.get("/", async (req, res, next) => {
    try {
        const query = parseOrThrow(listQuerySchema, req.query);

        res.json(
            await listInbox(currentEmpUUID(req), {
                category: query.category,
                unreadOnly: query.unread === "true",
                page: query.page,
                limit: query.limit,
            }),
        );
    } catch (error) {
        next(error);
    }
});

// GET /api/notifications/unread-count  -> { unread_count }
notificationsRouter.get("/unread-count", async (req, res, next) => {
    try {
        res.json({ unread_count: await getUnreadCount(currentEmpUUID(req)) });
    } catch (error) {
        next(error);
    }
});

// POST /api/notifications/read-all   body (optional): { category }
notificationsRouter.post("/read-all", async (req, res, next) => {
    try {
        const { category } = parseOrThrow(readAllSchema, req.body ?? {});
        res.json(await markAllRead(currentEmpUUID(req), category));
    } catch (error) {
        next(error);
    }
});

// PATCH /api/notifications/:recipient_UUID/read
notificationsRouter.patch("/:recipient_UUID/read", async (req, res, next) => {
    try {
        const recipientUUID = parseOrThrow(
            idSchema,
            String(req.params.recipient_UUID),
        );
        res.json(await markRead(currentEmpUUID(req), recipientUUID));
    } catch (error) {
        next(error);
    }
});
