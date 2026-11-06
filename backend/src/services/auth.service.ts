import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "../lib/httpError.js";
import { prisma } from "../lib/prisma.js";

export interface TokenPayload {
    sub: string; // account_UUID
    jti: string; // unique token ID (used for logout)
    exp: number; // expiry, seconds since epoch
}

// Compared against when the username does not exist, so a missing user and a
// wrong password take the same time to reject (stops username guessing by timing).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", env.bcryptRounds);

const accountWithAccess = {
    account_UUID: true,
    emp_UUID: true,
    username: true,
    password_hash: true,
    account_status: true,
    employee: {
        select: {
            record_status: true,
            position: {
                select: {
                    position_UUID: true,
                    position_name: true,
                    is_active: true,
                    features: {
                        where: {
                            feature: {
                                is_active: true,
                            },
                        },
                        select: {
                            feature: {
                                select: {
                                    feature_name: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    },
} as const;

export function signToken(account_UUID: string): string {
    return jwt.sign({}, env.jwtSecret, {
        subject: account_UUID,
        jwtid: randomUUID(),
        expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
    });
}

export function verifyToken(token: string): TokenPayload {
    const payload = jwt.verify(token, env.jwtSecret);
    if (
        typeof payload === "string" ||
        !payload.sub ||
        !payload.jti ||
        !payload.exp
    ) {
        throw new Error("Malformed token");
    }
    return { sub: payload.sub, jti: payload.jti, exp: payload.exp };
}

// Roles and features the account holds, with duplicates removed.
export function collectAccess(
    features: {
        feature: {
            feature_name: string;
        };
    }[],
) {
    return {
        features: [
            ...new Set(features.map((f) => f.feature.feature_name)),
        ],
    };
}

export async function login(username: string, password: string) {
    const account = await prisma.userAccount.findUnique({
        where: { username: username.trim().toLowerCase() },
        select: accountWithAccess,
    });

    // Always run bcrypt, even for unknown users.
    const passwordMatches = await bcrypt.compare(
        password,
        account?.password_hash ?? DUMMY_HASH,
    );

    if (!account || !passwordMatches) {
        throw new HttpError(401, "Invalid username or password");
    }

    // Check the status only AFTER the password is correct, so the message
    // does not reveal which usernames exist.
    if (account.account_status !== "Active") {
        throw new HttpError(
            403,
            "This account is not active. Contact an administrator.",
        );
    }

    const position = account.employee.position;

    // Check whether the employee's position is active.
    if (!position.is_active) {
        throw new HttpError(
            403,
            "Your assigned position is inactive. Contact an administrator.",
        );
    }

    const access = collectAccess(position.features);

    // The position must have at least one active system feature.
    if (access.features.length === 0) {
        throw new HttpError(
            403,
            "No system features are assigned to your position. Contact an administrator.",
        );
    }

    await prisma.userAccount.update({
        where: { account_UUID: account.account_UUID },
        data: { last_login_at: new Date() },
    });

    return {
        token: signToken(account.account_UUID),
        user: {
            account_UUID: account.account_UUID,
            emp_UUID: account.emp_UUID,
            username: account.username,
            position: {
                position_UUID: position.position_UUID,
                position_name: position.position_name,
            },
            ...access,
        },
    };
}
