import { Router } from "express";
import { parseOrThrow } from "../lib/validate.js";
import { HttpError } from "../lib/httpError.js";
import {
  createUserAccount,
  createUserSchema,
  listRoles,
  listUsers,
  updateRolesSchema,
  updateUserRoles,
} from "../services/user.service.js";

// Mounted in server.ts behind requireAuth + requireFeature(FEATURE.UserAccounts),
// so only the Administrator role reaches these handlers.
export const usersRouter = Router();

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/users
usersRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listUsers());
  } catch (error) {
    next(error);
  }
});

// GET /api/users/roles
usersRouter.get("/roles", async (_req, res, next) => {
  try {
    res.json(await listRoles());
  } catch (error) {
    next(error);
  }
});

// POST /api/users   body: { emp_UUID, username, password, role_UUIDs: [...] }
usersRouter.post("/", async (req, res, next) => {
  try {
    const input = parseOrThrow(createUserSchema, req.body);
    res.status(201).json(await createUserAccount(input));
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:account_UUID/roles   body: { role_UUIDs: [...] }
usersRouter.put("/:account_UUID/roles", async (req, res, next) => {
  try {
    const account_UUID = String(req.params.account_UUID);
    if (!UUID_PATTERN.test(account_UUID)) {
      throw new HttpError(400, "Invalid account ID");
    }
    const { role_UUIDs } = parseOrThrow(updateRolesSchema, req.body);
    res.json(await updateUserRoles(req.user!.account_UUID, account_UUID, role_UUIDs));
  } catch (error) {
    next(error);
  }
});
