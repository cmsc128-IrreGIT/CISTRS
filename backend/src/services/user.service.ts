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
  role_UUIDs: z
    .array(z.string().uuid("Each role ID must be a valid UUID"))
    .min(1, "Assign at least one role")
    .max(10),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export async function createUserAccount(input: CreateUserInput) {
  const role_UUIDs = [...new Set(input.role_UUIDs)];

  // 1. The employee must exist, be active, and not have an account yet.
  const employee = await prisma.employee.findUnique({
    where: { emp_UUID: input.emp_UUID },
    select: {
      record_status: true,
      user_account: { select: { account_UUID: true } },
    },
  });
  if (!employee) throw new HttpError(404, "Employee not found");
  if (employee.record_status !== "Active") {
    throw new HttpError(400, "Cannot create an account for an inactive employee");
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

  // 3. Every role must exist.
  const roleCount = await prisma.systemRole.count({
    where: { role_UUID: { in: role_UUIDs } },
  });
  if (roleCount !== role_UUIDs.length) {
    throw new HttpError(400, "One or more roles do not exist");
  }

  // 4. Create the account and its role links in one transaction.
  //    A race between two admins still ends in a 409 (see errorHandler, code P2002).
  const password_hash = await bcrypt.hash(input.password, env.bcryptRounds);

  const account = await prisma.userAccount.create({
    data: {
      emp_UUID: input.emp_UUID,
      username: input.username,
      password_hash,
      account_status: "Active",
      roles: { create: role_UUIDs.map((role_UUID) => ({ role_UUID })) },
    },
    select: {
      account_UUID: true,
      emp_UUID: true,
      username: true,
      account_status: true,
      created_at: true,
      roles: { select: { role: { select: { role_UUID: true, role_name: true } } } },
    },
  });

  // Never return password_hash.
  return {
    account_UUID: account.account_UUID,
    emp_UUID: account.emp_UUID,
    username: account.username,
    account_status: account.account_status,
    created_at: account.created_at,
    roles: account.roles.map((r) => r.role),
  };
}

// Roles an admin can pick from when creating an account.
export function listRoles() {
  return prisma.systemRole.findMany({
    orderBy: { role_name: "asc" },
    select: { role_UUID: true, role_name: true, description: true },
  });
}

const accountSummary = {
  account_UUID: true,
  username: true,
  account_status: true,
  last_login_at: true,
  employee: { select: { emp_number: true, f_name: true, l_name: true } },
  roles: { select: { role: { select: { role_UUID: true, role_name: true } } } },
} as const;

function toSummary<
  T extends { roles: { role: { role_UUID: string; role_name: string } }[] },
>(account: T) {
  return { ...account, roles: account.roles.map((r) => r.role) };
}

// All accounts with their roles. password_hash is never selected.
export async function listUsers() {
  const accounts = await prisma.userAccount.findMany({
    orderBy: { username: "asc" },
    select: accountSummary,
  });
  return accounts.map(toSummary);
}

export const updateRolesSchema = z.object({
  role_UUIDs: z
    .array(z.string().uuid("Each role ID must be a valid UUID"))
    .min(1, "Assign at least one role")
    .max(10),
});

// Replace ALL roles of an account. The change applies to the user's very next
// request, because requireAuth reads roles from the database on every request.
export async function updateUserRoles(
  actingAccountUUID: string,
  targetAccountUUID: string,
  rawRoleUUIDs: string[],
) {
  if (actingAccountUUID === targetAccountUUID) {
    throw new HttpError(400, "You cannot change your own roles");
  }

  const role_UUIDs = [...new Set(rawRoleUUIDs)];

  const target = await prisma.userAccount.findUnique({
    where: { account_UUID: targetAccountUUID },
    select: { account_UUID: true },
  });
  if (!target) throw new HttpError(404, "User account not found");

  const roleCount = await prisma.systemRole.count({
    where: { role_UUID: { in: role_UUIDs } },
  });
  if (roleCount !== role_UUIDs.length) {
    throw new HttpError(400, "One or more roles do not exist");
  }

  // Delete the old links and create the new ones in one transaction.
  await prisma.$transaction([
    prisma.accountRole.deleteMany({ where: { account_UUID: targetAccountUUID } }),
    prisma.accountRole.createMany({
      data: role_UUIDs.map((role_UUID) => ({
        account_UUID: targetAccountUUID,
        role_UUID,
      })),
    }),
  ]);

  const updated = await prisma.userAccount.findUniqueOrThrow({
    where: { account_UUID: targetAccountUUID },
    select: accountSummary,
  });
  return toSummary(updated);
}
