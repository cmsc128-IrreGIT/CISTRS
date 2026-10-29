import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../generated/prisma/client.js";

// -----------------------------------------------------------------------------
// Setup
// -----------------------------------------------------------------------------

function requireEnv(name: string, hint: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not set. ${hint}`);
    return value;
}

const DATABASE_URL = requireEnv(
    "DATABASE_URL",
    "Copy .env.example to .env first.",
);
// The seeder hashes this plain-text value (bcrypt) for every seeded account.
const SEED_PASSWORD = requireEnv(
    "SEED_DEFAULT_PASSWORD",
    "Add it to .env; the seeder uses it as the password for every seeded account.",
);

const PASSWORD_PLACEHOLDER = "REPLACE_WITH_REAL_BCRYPT_HASH";
const BCRYPT_ROUNDS = 12;

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: DATABASE_URL }),
});

type Row = Record<string, unknown>;
type SeedFile = Record<string, Row[]>;

const seedPath = path.resolve(process.cwd(), "src", "seeder", "seed.json");
const seed = JSON.parse(readFileSync(seedPath, "utf8")) as SeedFile;

function rows(table: string): Row[] {
    const data = seed[table];
    if (!Array.isArray(data)) {
        throw new Error(`seed.json is missing the "${table}" table.`);
    }
    return data;
}

// "2026-10-01" / "2026-10-01T08:00:00Z" -> Date. Keeps null as null.
function toDate(value: unknown): Date | null {
    if (value === null || value === undefined) return null;
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid date in seed.json: ${String(value)}`);
    }
    return date;
}

// -----------------------------------------------------------------------------
// Seed steps (parents first, children last)
// -----------------------------------------------------------------------------

async function seedAll(tx: Prisma.TransactionClient) {
    const counts: Record<string, number> = {};

    const insert = async (
        table: string,
        run: (data: Row[]) => Promise<{ count: number }>,
        map: (row: Row) => Row = (row) => row,
    ) => {
        const data = rows(table).map(map);
        const result = await run(data);
        counts[table] = result.count;
    };

    // --- Lookup / reference tables ---------------------------------------------
    await insert("BASE", (data) =>
        tx.base.createMany({
            data: data as Prisma.BaseCreateManyInput[],
            skipDuplicates: true,
        }),
    );
    await insert("EMPLOYMENT_STATUS", (data) =>
        tx.employmentStatus.createMany({
            data: data as Prisma.EmploymentStatusCreateManyInput[],
            skipDuplicates: true,
        }),
    );
    await insert("LICENSE_TYPE", (data) =>
        tx.licenseType.createMany({
            data: data as Prisma.LicenseTypeCreateManyInput[],
            skipDuplicates: true,
        }),
    );
    await insert("SYSTEM_ROLE", (data) =>
        tx.systemRole.createMany({
            data: data as Prisma.SystemRoleCreateManyInput[],
            skipDuplicates: true,
        }),
    );
    await insert("SYSTEM_FEATURE", (data) =>
        tx.systemFeature.createMany({
            data: data as Prisma.SystemFeatureCreateManyInput[],
            skipDuplicates: true,
        }),
    );
    await insert("INVENTORY_LOCATION", (data) =>
        tx.inventoryLocation.createMany({
            data: data as Prisma.InventoryLocationCreateManyInput[],
            skipDuplicates: true,
        }),
    );
    await insert("PART", (data) =>
        tx.part.createMany({
            data: data as Prisma.PartCreateManyInput[],
            skipDuplicates: true,
        }),
    );
    await insert("CONTACT", (data) =>
        tx.contact.createMany({
            data: data as Prisma.ContactCreateManyInput[],
            skipDuplicates: true,
        }),
    );

    // --- Organizations and the ISA subtypes ------------------------------------
    await insert("ORGANIZATION", (data) =>
        tx.organization.createMany({
            data: data as Prisma.OrganizationCreateManyInput[],
            skipDuplicates: true,
        }),
    );
    await insert("SUPPLIER", (data) =>
        tx.supplier.createMany({
            data: data as Prisma.SupplierCreateManyInput[],
            skipDuplicates: true,
        }),
    );
    await insert("MANUFACTURER", (data) =>
        tx.manufacturer.createMany({
            data: data as Prisma.ManufacturerCreateManyInput[],
            skipDuplicates: true,
        }),
    );
    await insert("ORGANIZATION_CONTACT", (data) =>
        tx.organizationContact.createMany({
            data: data as Prisma.OrganizationContactCreateManyInput[],
            skipDuplicates: true,
        }),
    );
    await insert("PART_SUPPLIER", (data) =>
        tx.partSupplier.createMany({
            data: data as Prisma.PartSupplierCreateManyInput[],
            skipDuplicates: true,
        }),
    );
    await insert("PART_MANUFACTURER", (data) =>
        tx.partManufacturer.createMany({
            data: data as Prisma.PartManufacturerCreateManyInput[],
            skipDuplicates: true,
        }),
    );

    // --- Personnel --------------------------------------------------------------
    await insert(
        "EMPLOYEE",
        (data) =>
            tx.employee.createMany({
                data: data as Prisma.EmployeeCreateManyInput[],
                skipDuplicates: true,
            }),
        (row) => ({ ...row, date_of_birth: toDate(row.date_of_birth) }),
    );
    await insert("EMPLOYEE_CONTACT", (data) =>
        tx.employeeContact.createMany({
            data: data as Prisma.EmployeeContactCreateManyInput[],
            skipDuplicates: true,
        }),
    );
    await insert(
        "EMPLOYEE_LICENSE",
        (data) =>
            tx.employeeLicense.createMany({
                data: data as Prisma.EmployeeLicenseCreateManyInput[],
                skipDuplicates: true,
            }),
        (row) => ({
            ...row,
            date_issued: toDate(row.date_issued),
            expiry_date: toDate(row.expiry_date),
        }),
    );

    // --- Access control ---------------------------------------------------------
    // Replace the placeholder hash with a real bcrypt hash of SEED_DEFAULT_PASSWORD.
    const accounts = await Promise.all(
        rows("USER_ACCOUNT").map(async (row) => ({
            ...row,
            password_hash:
                row.password_hash === PASSWORD_PLACEHOLDER
                    ? await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS)
                    : row.password_hash,
            created_at: toDate(row.created_at),
            last_login_at: toDate(row.last_login_at),
        })),
    );
    const accountResult = await tx.userAccount.createMany({
        data: accounts as Prisma.UserAccountCreateManyInput[],
        skipDuplicates: true,
    });
    counts["USER_ACCOUNT"] = accountResult.count;

    await insert("ACCOUNT_ROLE", (data) =>
        tx.accountRole.createMany({
            data: data as Prisma.AccountRoleCreateManyInput[],
            skipDuplicates: true,
        }),
    );
    await insert("ROLE_FEATURE_ACCESS", (data) =>
        tx.roleFeatureAccess.createMany({
            data: data as Prisma.RoleFeatureAccessCreateManyInput[],
            skipDuplicates: true,
        }),
    );

    // --- Inventory (depends on parts, locations, employees) ---------------------
    await insert("INVENTORY_STATUS", (data) =>
        tx.inventoryStatus.createMany({
            data: data as Prisma.InventoryStatusCreateManyInput[],
            skipDuplicates: true,
        }),
    );
    await insert(
        "INVENTORY_TRANSACTION",
        (data) =>
            tx.inventoryTransaction.createMany({
                data: data as Prisma.InventoryTransactionCreateManyInput[],
                skipDuplicates: true,
            }),
        (row) => ({ ...row, created_at: toDate(row.created_at) }),
    );

    return counts;
}

// -----------------------------------------------------------------------------
// Post-seed checks: fail loudly if the database does not match seed.json
// -----------------------------------------------------------------------------

async function verify() {
    const problems: string[] = [];

    // 1. Row counts: every table must hold at least the rows in seed.json.
    const expected: Record<string, () => Promise<number>> = {
        BASE: () => prisma.base.count(),
        EMPLOYMENT_STATUS: () => prisma.employmentStatus.count(),
        EMPLOYEE: () => prisma.employee.count(),
        CONTACT: () => prisma.contact.count(),
        EMPLOYEE_CONTACT: () => prisma.employeeContact.count(),
        LICENSE_TYPE: () => prisma.licenseType.count(),
        EMPLOYEE_LICENSE: () => prisma.employeeLicense.count(),
        ORGANIZATION: () => prisma.organization.count(),
        SUPPLIER: () => prisma.supplier.count(),
        MANUFACTURER: () => prisma.manufacturer.count(),
        PART: () => prisma.part.count(),
        INVENTORY_LOCATION: () => prisma.inventoryLocation.count(),
        PART_SUPPLIER: () => prisma.partSupplier.count(),
        PART_MANUFACTURER: () => prisma.partManufacturer.count(),
        INVENTORY_STATUS: () => prisma.inventoryStatus.count(),
        INVENTORY_TRANSACTION: () => prisma.inventoryTransaction.count(),
        ORGANIZATION_CONTACT: () => prisma.organizationContact.count(),
        USER_ACCOUNT: () => prisma.userAccount.count(),
        SYSTEM_ROLE: () => prisma.systemRole.count(),
        ACCOUNT_ROLE: () => prisma.accountRole.count(),
        SYSTEM_FEATURE: () => prisma.systemFeature.count(),
        ROLE_FEATURE_ACCESS: () => prisma.roleFeatureAccess.count(),
    };
    for (const [table, count] of Object.entries(expected)) {
        const actual = await count();
        const wanted = rows(table).length;
        if (actual < wanted) {
            problems.push(
                `${table}: expected >= ${wanted} rows, found ${actual}`,
            );
        }
    }

    // 2. Ledger check: each stock row must equal the sum of its transactions.
    const statuses = await prisma.inventoryStatus.findMany({
        select: { status_UUID: true, current_quantity: true },
    });
    const sums = await prisma.inventoryTransaction.groupBy({
        by: ["status_UUID"],
        _sum: { quantity_change: true },
    });
    const sumByStatus = new Map(
        sums.map((s) => [s.status_UUID, s._sum.quantity_change ?? 0]),
    );
    for (const status of statuses) {
        const ledger = sumByStatus.get(status.status_UUID) ?? 0;
        if (ledger !== status.current_quantity) {
            problems.push(
                `INVENTORY_STATUS ${status.status_UUID}: quantity ${status.current_quantity} != ledger ${ledger}`,
            );
        }
    }

    if (problems.length > 0) {
        throw new Error(
            `Seed verification failed:\n - ${problems.join("\n - ")}`,
        );
    }
}

// -----------------------------------------------------------------------------
// Run
// -----------------------------------------------------------------------------

async function main() {
    console.log("Seeding CISTRS database...");

    const counts = await prisma.$transaction(seedAll, {
        timeout: 120_000,
        maxWait: 20_000,
    });

    for (const [table, inserted] of Object.entries(counts)) {
        console.log(`  ${table.padEnd(24)} +${inserted}`);
    }

    await verify();
    console.log("Seed complete. Verification passed.");
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
