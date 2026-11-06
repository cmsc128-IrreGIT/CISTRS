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

function toDate(value: unknown): Date | null {
    if (value === null || value === undefined) return null;

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid date in seed.json: ${String(value)}`);
    }

    return date;
}

function requireString(
    row: Row,
    field: string,
    table: string,
): string {
    const value = row[field];

    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(
            `${table} is missing a valid "${field}" value in seed.json.`,
        );
    }

    return value;
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

    // --- 1. Core Lookup / Reference Tables ----------------------------------

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

    await insert("RENEWAL_STATUS", (data) =>
        tx.renewalStatus.createMany({
            data: data as Prisma.RenewalStatusCreateManyInput[],
            skipDuplicates: true,
        }),
    );

    await insert("POSITION", (data) =>
        tx.position.createMany({
            data: data as Prisma.PositionCreateManyInput[],
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

    // --- 2. Aircraft, Flight, and Training Lookups ---------------------------

    await insert("AIRCRAFT_STATUS", (data) =>
        tx.aircraftStatus.createMany({
            data: data as Prisma.AircraftStatusCreateManyInput[],
            skipDuplicates: true,
        }),
    );

    await insert("AIRCRAFT_TYPE", (data) =>
        tx.aircraftType.createMany({
            data: data as Prisma.AircraftTypeCreateManyInput[],
            skipDuplicates: true,
        }),
    );

    await insert("FLIGHT_STATUS", (data) =>
        tx.flightStatus.createMany({
            data: data as Prisma.FlightStatusCreateManyInput[],
            skipDuplicates: true,
        }),
    );

    await insert("FLIGHT_TYPE", (data) =>
        tx.flightType.createMany({
            data: data as Prisma.FlightTypeCreateManyInput[],
            skipDuplicates: true,
        }),
    );

    await insert("DELAY_CATEGORY", (data) =>
        tx.delayCategory.createMany({
            data: data as Prisma.DelayCategoryCreateManyInput[],
            skipDuplicates: true,
        }),
    );

    await insert("TRAINING_TYPE", (data) =>
        tx.trainingType.createMany({
            data: data as Prisma.TrainingTypeCreateManyInput[],
            skipDuplicates: true,
        }),
    );

    await insert("TRAINING_PROVIDER", (data) =>
        tx.trainingProvider.createMany({
            data: data as Prisma.TrainingProviderCreateManyInput[],
            skipDuplicates: true,
        }),
    );

    // --- 3. Organizations and Subtypes ---------------------------------------

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

    // --- 4. Personnel ---------------------------------------------------------

    await insert(
        "EMPLOYEE",
        (data) =>
            tx.employee.createMany({
                data: data as Prisma.EmployeeCreateManyInput[],
                skipDuplicates: true,
            }),
        (row) => ({
            ...row,
            date_of_birth: toDate(row.date_of_birth),
            date_hired: toDate(row.date_hired),
        }),
    );

    await insert("EMPLOYEE_CONTACT", (data) =>
        tx.employeeContact.createMany({
            data: data as Prisma.EmployeeContactCreateManyInput[],
            skipDuplicates: true,
        }),
    );

    await insert("EMERGENCY_CONTACT", (data) =>
        tx.emergencyContact.createMany({
            data: data as Prisma.EmergencyContactCreateManyInput[],
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

    await insert(
        "MEDICAL_CERTIFICATE",
        (data) =>
            tx.medicalCertificate.createMany({
                data: data as Prisma.MedicalCertificateCreateManyInput[],
                skipDuplicates: true,
            }),
        (row) => ({
            ...row,
            date_issued: toDate(row.date_issued),
            expiry_date: toDate(row.expiry_date),
        }),
    );

    await insert(
        "TRAINING_RECORD",
        (data) =>
            tx.trainingRecord.createMany({
                data: data as Prisma.TrainingRecordCreateManyInput[],
                skipDuplicates: true,
            }),
        (row) => ({
            ...row,
            date_completed: toDate(row.date_completed),
            expiry_date: toDate(row.expiry_date),
        }),
    );

    // --- 5. Access Control ----------------------------------------------------

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

    await insert(
        "POSITION_FEATURE_ACCESS",
        (data) =>
            tx.positionFeatureAccess.createMany({
                data: data as Prisma.PositionFeatureAccessCreateManyInput[],
                skipDuplicates: true,
            }),
        (row) => ({
            ...row,
            created_at: toDate(row.created_at),
        }),
    );

    // --- 6. Inventory ---------------------------------------------------------

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
        (row) => ({
            ...row,
            created_at: toDate(row.created_at),
        }),
    );

    // --- 7. Aircraft and Maintenance -----------------------------------------

    await insert(
        "AIRCRAFT",
        (data) =>
            tx.aircraft.createMany({
                data: data as Prisma.AircraftCreateManyInput[],
                skipDuplicates: true,
            }),
        (row) => ({
            ...row,
            hours_updated_at: toDate(row.hours_updated_at),
        }),
    );

    await insert(
        "AD_RECORD",
        (data) =>
            tx.adRecord.createMany({
                data: data as Prisma.AdRecordCreateManyInput[],
                skipDuplicates: true,
            }),
        (row) => ({
            ad_UUID: row.ad_UUID,
            aircraft_UUID: row.aircraft_UUID,
            mechanic_emp_UUID: requireString(
                row,
                "mechanic_emp_UUID",
                "AD_RECORD",
            ),
            faa_ad_number: row.faa_ad_number,
            amendment_number: row.amendment_number ?? null,
            subject: row.subject,
            ad_category: row.ad_category,
            effective_date: toDate(row.effective_date),
            compliance_method: row.compliance_method,
            frequency: row.frequency ?? null,
            date_of_compliance: toDate(
                row.last_accomplished_date ?? row.date_of_compliance,
            ),
            next_due_date: toDate(row.next_due_date),
            next_due_hours:
                row.next_due_hours ?? row.due_hours ?? null,
            mechanic_license_number: requireString(
                row,
                "mechanic_license_number",
                "AD_RECORD",
            ),
            remarks: row.remarks ?? null,
            pdf_link: row.pdf_link ?? null,
        }),
    );

    await insert(
        "CPCP_TASK",
        (data) =>
            tx.cpcpTask.createMany({
                data: data as Prisma.CpcpTaskCreateManyInput[],
                skipDuplicates: true,
            }),
        (row) => ({
            ...row,
            assigned_to: requireString(
                row,
                "assigned_to",
                "CPCP_TASK",
            ),
            due_date: toDate(row.due_date),
            last_accomplished_date: toDate(
                row.last_accomplished_date,
            ),
        }),
    );

    // --- 8. Flight Operations -----------------------------------------------

    await insert(
        "FLIGHT_SECTOR",
        (data) =>
            tx.flightSector.createMany({
                data: data as Prisma.FlightSectorCreateManyInput[],
                skipDuplicates: true,
            }),
        (row) => ({
            ...row,
            flight_date: toDate(row.flight_date),
            off_block: toDate(row.off_block),
            airborne: toDate(row.airborne),
            touchdown: toDate(row.touchdown),
            on_block: toDate(row.on_block),
        }),
    );

    await insert(
        "FUEL_TRANSACTION",
        (data) =>
            tx.fuelTransaction.createMany({
                data: data as Prisma.FuelTransactionCreateManyInput[],
                skipDuplicates: true,
            }),
        (row) => ({
            fuel_transaction_UUID: row.fuel_transaction_UUID,
            aircraft_UUID: row.aircraft_UUID,
            sector_UUID: row.sector_UUID ?? null,
            recorded_by: row.recorded_by,
            issued_to: row.issued_to,
            transaction_date: toDate(row.transaction_date),
            transaction_type: row.transaction_type,
            quantity_gal: row.quantity_gals ?? row.quantity_gal,
            remarks: row.remarks ?? null,
        }),
    );

    return counts;
}

// -----------------------------------------------------------------------------
// Post-seed checks
// -----------------------------------------------------------------------------

async function verify() {
    const problems: string[] = [];

    // 1. Verify row counts for all 37 models.
    const expected: Record<string, () => Promise<number>> = {
        BASE: () => prisma.base.count(),
        EMPLOYMENT_STATUS: () => prisma.employmentStatus.count(),
        LICENSE_TYPE: () => prisma.licenseType.count(),
        RENEWAL_STATUS: () => prisma.renewalStatus.count(),
        POSITION: () => prisma.position.count(),
        SYSTEM_FEATURE: () => prisma.systemFeature.count(),
        INVENTORY_LOCATION: () => prisma.inventoryLocation.count(),
        PART: () => prisma.part.count(),
        CONTACT: () => prisma.contact.count(),

        ORGANIZATION: () => prisma.organization.count(),
        SUPPLIER: () => prisma.supplier.count(),
        MANUFACTURER: () => prisma.manufacturer.count(),
        ORGANIZATION_CONTACT: () => prisma.organizationContact.count(),
        PART_SUPPLIER: () => prisma.partSupplier.count(),
        PART_MANUFACTURER: () => prisma.partManufacturer.count(),

        EMPLOYEE: () => prisma.employee.count(),
        EMPLOYEE_CONTACT: () => prisma.employeeContact.count(),
        EMERGENCY_CONTACT: () => prisma.emergencyContact.count(),
        EMPLOYEE_LICENSE: () => prisma.employeeLicense.count(),
        MEDICAL_CERTIFICATE: () => prisma.medicalCertificate.count(),
        TRAINING_TYPE: () => prisma.trainingType.count(),
        TRAINING_PROVIDER: () => prisma.trainingProvider.count(),
        TRAINING_RECORD: () => prisma.trainingRecord.count(),

        USER_ACCOUNT: () => prisma.userAccount.count(),
        POSITION_FEATURE_ACCESS: () =>
            prisma.positionFeatureAccess.count(),

        INVENTORY_STATUS: () => prisma.inventoryStatus.count(),
        INVENTORY_TRANSACTION: () =>
            prisma.inventoryTransaction.count(),

        AIRCRAFT_STATUS: () => prisma.aircraftStatus.count(),
        AIRCRAFT_TYPE: () => prisma.aircraftType.count(),
        AIRCRAFT: () => prisma.aircraft.count(),
        AD_RECORD: () => prisma.adRecord.count(),
        CPCP_TASK: () => prisma.cpcpTask.count(),

        FLIGHT_STATUS: () => prisma.flightStatus.count(),
        FLIGHT_TYPE: () => prisma.flightType.count(),
        DELAY_CATEGORY: () => prisma.delayCategory.count(),
        FLIGHT_SECTOR: () => prisma.flightSector.count(),
        FUEL_TRANSACTION: () => prisma.fuelTransaction.count(),
    };

    for (const [table, count] of Object.entries(expected)) {
        const actual = await count();
        const wanted = rows(table).length;

        if (actual < wanted) {
            problems.push(
                `${table}: expected at least ${wanted} rows, found ${actual}`,
            );
        }
    }

    // 2. Verify employee position references.
    const positionUUIDs = new Set(
        rows("POSITION").map((position) => position.position_UUID),
    );

    const employeesWithoutPosition = rows("EMPLOYEE").filter(
        (employee) => !positionUUIDs.has(employee.position_UUID),
    ).length;

    if (employeesWithoutPosition > 0) {
        problems.push(
            `${employeesWithoutPosition} EMPLOYEE row(s) reference a missing POSITION`,
        );
    }

    // 3. Verify inventory ledger quantities.
    const statuses = await prisma.inventoryStatus.findMany({
        select: {
            status_UUID: true,
            current_quantity: true,
        },
    });

    const sums = await prisma.inventoryTransaction.groupBy({
        by: ["status_UUID"],
        _sum: {
            quantity_change: true,
        },
    });

    const sumByStatus = new Map(
        sums.map((status) => [
            status.status_UUID,
            status._sum.quantity_change ?? 0,
        ]),
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
