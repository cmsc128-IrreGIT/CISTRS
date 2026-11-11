-- =============================================================================
-- Integrity, audit and tidiness hardening
--
-- Applies on top of `init`. Safe on a database that already holds data:
--   * personnel_category text  -> lookup table (existing values are backfilled)
--   * new audit columns have DEFAULT CURRENT_TIMESTAMP, so existing rows are filled
--   * new CHECK / UNIQUE rules will fail loudly if existing rows already break them
--
-- Note: for rows that existed before this migration, created_at / updated_at hold
-- the time of this migration (the real creation time is unknown), and
-- created_by / updated_by are NULL.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. PERSONNEL CATEGORY: free text on employee -> lookup table
-- -----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "personnel_category" (
    "personnel_category_UUID" UUID NOT NULL,
    "category_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "personnel_category_pkey" PRIMARY KEY ("personnel_category_UUID")
);

-- CreateIndex
CREATE UNIQUE INDEX "personnel_category_category_name_key" ON "personnel_category"("category_name");

-- The categories already in use by the system.
INSERT INTO "personnel_category" ("personnel_category_UUID", "category_name", "description") VALUES
    ('12000000-0000-4000-8000-000000000001', 'Pilot', 'Flight crew: captains and first officers.'),
    ('12000000-0000-4000-8000-000000000002', 'Operations Personnel', 'Flight operations and dispatch staff.'),
    ('12000000-0000-4000-8000-000000000003', 'Aircraft Maintenance Technician', 'Licensed technicians who maintain and certify aircraft.'),
    ('12000000-0000-4000-8000-000000000004', 'Inventory Personnel', 'Staff who manage parts and stock.'),
    ('12000000-0000-4000-8000-000000000005', 'Quality / Safety Personnel', 'Quality assurance and safety staff.');

-- Keep any other value that is already stored on an employee, so nothing is lost.
INSERT INTO "personnel_category" ("personnel_category_UUID", "category_name", "description")
SELECT gen_random_uuid(), e."personnel_category", 'Migrated from existing employee records.'
FROM (SELECT DISTINCT "personnel_category" FROM "employee") e
WHERE NOT EXISTS (
    SELECT 1 FROM "personnel_category" c WHERE c."category_name" = e."personnel_category"
);

-- AlterTable: add the FK column, backfill it, then drop the text column.
ALTER TABLE "employee" ADD COLUMN "personnel_category_UUID" UUID;

UPDATE "employee" e
SET "personnel_category_UUID" = c."personnel_category_UUID"
FROM "personnel_category" c
WHERE c."category_name" = e."personnel_category";

ALTER TABLE "employee" ALTER COLUMN "personnel_category_UUID" SET NOT NULL;
ALTER TABLE "employee" DROP COLUMN "personnel_category";


-- -----------------------------------------------------------------------------
-- 2. AUDIT COLUMNS
-- -----------------------------------------------------------------------------

-- Who created / last changed an employee record (nullable: unknown for old rows).
ALTER TABLE "employee"
    ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "created_by" UUID,
    ADD COLUMN "updated_by" UUID;

-- When a record was created and last changed.
ALTER TABLE "part"
    ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "inventory_status"
    ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "employee_license"
    ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "medical_certificate"
    ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "training_record"
    ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "aircraft"
    ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ad_record"
    ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "flight_sector"
    ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "fuel_transaction"
    ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- cpcp_task already has last_updated; it only lacks a creation time.
ALTER TABLE "cpcp_task"
    ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;


-- -----------------------------------------------------------------------------
-- 3. UNIQUENESS (stops duplicates the application could otherwise insert)
--    If one of these fails, the error names the duplicated key; fix that row first.
-- -----------------------------------------------------------------------------

-- CreateIndex
CREATE UNIQUE INDEX "contact_contact_type_contact_value_key" ON "contact"("contact_type", "contact_value");
CREATE UNIQUE INDEX "organization_organization_name_organization_location_key" ON "organization"("organization_name", "organization_location");
CREATE UNIQUE INDEX "inventory_location_location_name_storage_area_key" ON "inventory_location"("location_name", "storage_area");
CREATE UNIQUE INDEX "employee_license_emp_UUID_license_type_UUID_license_number_key" ON "employee_license"("emp_UUID", "license_type_UUID", "license_number");
CREATE UNIQUE INDEX "cpcp_task_aircraft_UUID_task_reference_key" ON "cpcp_task"("aircraft_UUID", "task_reference");

-- DropIndex: now covered by the unique indexes above (same leading column).
DROP INDEX "employee_license_emp_UUID_idx";
DROP INDEX "cpcp_task_aircraft_UUID_idx";


-- -----------------------------------------------------------------------------
-- 4. INDEXES on foreign keys / filter columns that had none
-- -----------------------------------------------------------------------------

-- CreateIndex
CREATE INDEX "employee_personnel_category_UUID_idx" ON "employee"("personnel_category_UUID");
CREATE INDEX "employee_record_status_idx" ON "employee"("record_status");
CREATE INDEX "employee_l_name_f_name_idx" ON "employee"("l_name", "f_name");
CREATE INDEX "employee_created_by_idx" ON "employee"("created_by");
CREATE INDEX "employee_updated_by_idx" ON "employee"("updated_by");
CREATE INDEX "flight_sector_sic_emp_UUID_idx" ON "flight_sector"("sic_emp_UUID");
CREATE INDEX "flight_sector_observer_emp_UUID_idx" ON "flight_sector"("observer_emp_UUID");
CREATE INDEX "flight_sector_entry_by_idx" ON "flight_sector"("entry_by");
CREATE INDEX "flight_sector_delay_category_UUID_idx" ON "flight_sector"("delay_category_UUID");


-- -----------------------------------------------------------------------------
-- 5. FOREIGN KEYS
-- -----------------------------------------------------------------------------

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "employee"("emp_UUID") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employee" ADD CONSTRAINT "employee_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "employee"("emp_UUID") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employee" ADD CONSTRAINT "employee_personnel_category_UUID_fkey" FOREIGN KEY ("personnel_category_UUID") REFERENCES "personnel_category"("personnel_category_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;


-- -----------------------------------------------------------------------------
-- 6. CHECK CONSTRAINTS (Prisma cannot express these in schema.prisma)
-- -----------------------------------------------------------------------------

-- Inventory (previously only in prisma/checks.sql, never applied)
ALTER TABLE "part"
    ADD CONSTRAINT "part_min_stock_level_nonnegative" CHECK ("min_stock_level" >= 0);
ALTER TABLE "inventory_status"
    ADD CONSTRAINT "inventory_status_quantity_nonnegative" CHECK ("current_quantity" >= 0);
ALTER TABLE "inventory_transaction"
    ADD CONSTRAINT "inventory_transaction_change_nonzero" CHECK ("quantity_change" <> 0);

-- Personnel
ALTER TABLE "employee_license"
    ADD CONSTRAINT "employee_license_expiry_after_issue"
    CHECK ("expiry_date" IS NULL OR "expiry_date" >= "date_issued");
ALTER TABLE "medical_certificate"
    ADD CONSTRAINT "medical_certificate_expiry_after_issue" CHECK ("expiry_date" >= "date_issued");
ALTER TABLE "training_record"
    ADD CONSTRAINT "training_record_expiry_after_completion"
    CHECK ("expiry_date" IS NULL OR "expiry_date" >= "date_completed");
ALTER TABLE "employee"
    ADD CONSTRAINT "employee_hired_after_birth" CHECK ("date_hired" >= "date_of_birth"),
    ADD CONSTRAINT "employee_not_own_supervisor" CHECK ("supervisor_emp_UUID" IS NULL OR "supervisor_emp_UUID" <> "emp_UUID"),
    ADD CONSTRAINT "employee_blood_type_valid"
    CHECK ("blood_type" IS NULL OR "blood_type" IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'));

-- Aircraft, logbook and fuel
ALTER TABLE "aircraft"
    ADD CONSTRAINT "aircraft_current_hours_nonnegative" CHECK ("current_hours" >= 0);
ALTER TABLE "flight_sector"
    ADD CONSTRAINT "flight_sector_pax_count_nonnegative" CHECK ("pax_count" >= 0),
    ADD CONSTRAINT "flight_sector_flight_time_nonnegative" CHECK ("flight_time" IS NULL OR "flight_time" >= 0),
    ADD CONSTRAINT "flight_sector_fuel_nonnegative"
    CHECK (COALESCE("fuel_departure", 0) >= 0 AND COALESCE("fuel_arrival", 0) >= 0 AND COALESCE("fuel_used", 0) >= 0),
    ADD CONSTRAINT "flight_sector_day_night_valid" CHECK ("day_night" IS NULL OR "day_night" IN ('Day', 'Night'));
ALTER TABLE "fuel_transaction"
    ADD CONSTRAINT "fuel_transaction_quantity_positive" CHECK ("quantity_gal" > 0);
