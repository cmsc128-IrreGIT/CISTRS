import { Router } from "express";
import { parseOrThrow } from "../lib/validate.js";
import {
    createUserAccount,
    createUserSchema,
    listUsers,
} from "../services/user.service.js";

// Mounted in server.ts behind requireAuth + requireFeature(FEATURE.UserAccounts).
export const usersRouter = Router();

// GET /api/users
usersRouter.get("/", async (_req, res, next) => {
    try {
        res.json(await listUsers());
    } catch (error) {
        next(error);
    }
});

// POST /api/users
// Body: { emp_UUID, username, password }
usersRouter.post("/", async (req, res, next) => {
    try {
        const input = parseOrThrow(createUserSchema, req.body);
        res.status(201).json(await createUserAccount(input));
    } catch (error) {
        next(error);
    }
});