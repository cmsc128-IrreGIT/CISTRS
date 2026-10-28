import type { NextFunction, Request, Response } from "express";
import type { FeatureName } from "../config/permissions.js";
import { isRevoked } from "../lib/tokenBlacklist.js";
import { prisma } from "../lib/prisma.js";
import { collectAccess, verifyToken } from "../services/auth.service.js";

export interface AuthUser {
  account_UUID: string;
  emp_UUID: string;
  username: string;
  roles: string[];
  features: string[];
  token_jti: string;
  token_exp: number;
}

// Adds `req.user` to Express's Request type.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Blocks the request unless it carries a valid, non-revoked token
// that belongs to an active account.
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    let payload;
    try {
      payload = verifyToken(header.slice(7).trim());
    } catch {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    if (isRevoked(payload.jti)) {
      res.status(401).json({ message: "Session ended. Please log in again." });
      return;
    }

    // Load the account on every request so deactivation and role changes
    // take effect immediately.
    const account = await prisma.userAccount.findUnique({
      where: { account_UUID: payload.sub },
      select: {
        account_UUID: true,
        emp_UUID: true,
        username: true,
        account_status: true,
        roles: {
          select: {
            role: {
              select: {
                role_name: true,
                features: {
                  select: { feature: { select: { feature_name: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!account || account.account_status !== "Active") {
      res.status(401).json({ message: "Account is not active" });
      return;
    }

    const access = collectAccess(account.roles);

    // Every account must hold at least one role.
    if (access.roles.length === 0) {
      res.status(403).json({ message: "No role is assigned to this account" });
      return;
    }

    req.user = {
      account_UUID: account.account_UUID,
      emp_UUID: account.emp_UUID,
      username: account.username,
      ...access,
      token_jti: payload.jti,
      token_exp: payload.exp,
    };
    next();
  } catch (error) {
    next(error);
  }
}

// Use AFTER requireAuth. Allows the request if the user holds at least one
// of the listed features (for example "Inventory" or "User Accounts").
export function requireFeature(...features: FeatureName[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    if (!features.some((feature) => req.user!.features.includes(feature))) {
      res.status(403).json({ message: "You do not have permission to do this" });
      return;
    }
    next();
  };
}
