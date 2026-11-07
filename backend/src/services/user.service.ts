import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "../config/env.js";
import { HttpError } from "../lib/httpError.js";
import { prisma } from "../lib/prisma.js";

// Rules for the request body of POST /api/users.
export const createUserSchema = z.object({
    emp_UUID: z.string().uuid("emp_UUID must be a valid UUID"),
    username: z
        .string()
        .trim()
        .toLowerCase()
        .min(3, "Username must be at least 3 characters")
        .max(50, "Username must be at most 50 characters")
        .regex(
            /^[a-z0-9._-]+$/,
            "Username may only contain letters, numbers, dots, underscores, and hyphens",
        ),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(72, "Password must be at most 72 characters") // bcrypt ignores anything past 72 bytes
        .regex(/[A-Za-z]/, "Password must contain a letter")
        .regex(/[0-9]/, "Password must contain a number"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// Create an account for an existing employee.
export async function createUserAccount(input: CreateUserInput) {

    // 1. The employee must exist, be active, and not have an account yet.
    const employee = await prisma.employee.findUnique({
        where: { emp_UUID: input.emp_UUID },
        select: {
            record_status: true,
            user_account: {
                select: { account_UUID: true },
            },
            position: {
                select: { is_active: true },
            },
        },
    });

    if (!employee) throw new HttpError(404, "Employee not found");

    if (employee.record_status !== "Active") {
        throw new HttpError(
            400,
            "Cannot create an account for an inactive employee",
        );
    }

    // The employee's position must be active.
    if (!employee.position.is_active) {
        throw new HttpError(
            400,
            "Cannot create an account for an employee with an inactive position",
        );
    }


    if (employee.user_account) {
        throw new HttpError(409, "This employee already has a user account");
    }

    // 2. The username must be free.
    const usernameTaken = await prisma.userAccount.findUnique({
        where: { username: input.username },
        select: { account_UUID: true },
    });
    if (usernameTaken) throw new HttpError(409, "Username is already taken");

    // 3. Create the account.
    // The employee's existing position determines their system access.
    const password_hash = await bcrypt.hash(input.password, env.bcryptRounds);

    const account = await prisma.userAccount.create({
        data: {
            emp_UUID: input.emp_UUID,
            username: input.username,
            password_hash,
            account_status: "Active",
        },
        select: {
            account_UUID: true,
            emp_UUID: true,
            username: true,
            account_status: true,
            created_at: true,
            employee: {
                select: {
                    emp_number: true,
                    position: {
                        select: {
                            position_UUID: true,
                            position_name: true,
                        },
                    },
                },
            },
        },
    });

    // Never return password_hash.
    return account;
}

// Active positions available for account-management display.
export function listPositions() {
    return prisma.position.findMany({
        where: { is_active: true },
        orderBy: { position_name: "asc" },
        select: {
            position_UUID: true,
            position_name: true,
            description: true,
        },
    });
}

const accountSummary = {
    account_UUID: true,
    username: true,
    account_status: true,
    last_login_at: true,
    employee: {
        select: {
            emp_UUID: true,
            emp_number: true,
            f_name: true,
            l_name: true,
            position: {
                select: {
                    position_UUID: true,
                    position_name: true,
                },
            },
        },
    },
} as const;


// List all accounts with their employee and position information.
// password_hash is never selected.
export async function listUsers() {
    return prisma.userAccount.findMany({
        orderBy: { username: "asc" },
        select: accountSummary,
    });
}



