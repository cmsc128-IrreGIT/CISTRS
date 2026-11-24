import { Router } from "express";
import { parseOrThrow } from "../lib/validate.js";
import {
    createUserAccount,
    createUserSchema,
    listEligibleEmployees,
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

// GET /api/users/eligible-employees
// Active employees with an active position and no account yet.
// Keep this above any /:id route added later, or "eligible-employees" would be read as an id.
usersRouter.get("/eligible-employees", async (_req, res, next) => {
    try {
        res.json(await listEligibleEmployees());
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
