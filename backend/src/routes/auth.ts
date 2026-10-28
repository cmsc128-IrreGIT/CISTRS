import { Router } from "express";
import { z } from "zod";
import { parseOrThrow } from "../lib/validate.js";
import { revokeToken } from "../lib/tokenBlacklist.js";
import { requireAuth } from "../middleware/auth.js";
import { login } from "../services/auth.service.js";

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// POST /api/auth/login   body: { username, password }
authRouter.post("/login", async (req, res, next) => {
  try {
    const { username, password } = parseOrThrow(loginSchema, req.body);
    res.json(await login(username, password));
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me   header: Authorization: Bearer <token>
authRouter.get("/me", requireAuth, (req, res) => {
  const { account_UUID, emp_UUID, username, roles, features } = req.user!;
  res.json({ account_UUID, emp_UUID, username, roles, features });
});

// POST /api/auth/logout   header: Authorization: Bearer <token>
authRouter.post("/logout", requireAuth, (req, res) => {
  revokeToken(req.user!.token_jti, req.user!.token_exp);
  res.json({ message: "Logged out successfully" });
});
