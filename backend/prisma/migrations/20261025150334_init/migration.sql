-- CreateEnum
CREATE TYPE "record_status" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "base_status" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('Active', 'Inactive', 'Locked');

-- CreateEnum
CREATE TYPE "sex" AS ENUM ('Male', 'Female');

-- CreateEnum
CREATE TYPE "contact_type" AS ENUM ('Email', 'Phone');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('RECEIPT', 'ISSUE', 'ADJUSTMENT', 'RETURN', 'TRANSFER');

-- CreateEnum
CREATE TYPE "expiry_type" AS ENUM ('EXPIRING', 'NON_EXPIRING', 'EXPIRED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "part" (
    "part_UUID" UUID NOT NULL,
    "part_number" TEXT NOT NULL,
    "part_name" TEXT NOT NULL,
    "unit_of_measure" TEXT NOT NULL,
    "min_stock_level" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,

    CONSTRAINT "part_pkey" PRIMARY KEY ("part_UUID")
);

-- CreateTable
CREATE TABLE "inventory_location" (
    "location_UUID" UUID NOT NULL,
    "location_name" TEXT NOT NULL,
    "storage_area" TEXT NOT NULL,

    CONSTRAINT "inventory_location_pkey" PRIMARY KEY ("location_UUID")
);

-- CreateTable
CREATE TABLE "inventory_status" (
    "status_UUID" UUID NOT NULL,
    "part_UUID" UUID NOT NULL,
    "location_UUID" UUID NOT NULL,
    "current_quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inventory_status_pkey" PRIMARY KEY ("status_UUID")
);

-- CreateTable
CREATE TABLE "inventory_transaction" (
    "transaction_UUID" UUID NOT NULL,
    "status_UUID" UUID NOT NULL,
    "transaction_type" "transaction_type" NOT NULL,
    "quantity_change" INTEGER NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "inventory_transaction_pkey" PRIMARY KEY ("transaction_UUID")
);

-- CreateTable
CREATE TABLE "organization" (
    "organization_UUID" UUID NOT NULL,
    "organization_name" TEXT NOT NULL,
    "organization_location" TEXT NOT NULL,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("organization_UUID")
);

-- CreateTable
CREATE TABLE "supplier" (
    "organization_UUID" UUID NOT NULL,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("organization_UUID")
);

-- CreateTable
CREATE TABLE "manufacturer" (
    "organization_UUID" UUID NOT NULL,

    CONSTRAINT "manufacturer_pkey" PRIMARY KEY ("organization_UUID")
);

-- CreateTable
CREATE TABLE "part_supplier" (
    "part_UUID" UUID NOT NULL,
    "supplier_UUID" UUID NOT NULL,

    CONSTRAINT "part_supplier_pkey" PRIMARY KEY ("part_UUID","supplier_UUID")
);

-- CreateTable
CREATE TABLE "part_manufacturer" (
    "part_UUID" UUID NOT NULL,
    "manufacturer_UUID" UUID NOT NULL,

    CONSTRAINT "part_manufacturer_pkey" PRIMARY KEY ("part_UUID","manufacturer_UUID")
);

-- CreateTable
CREATE TABLE "contact" (
    "contact_UUID" UUID NOT NULL,
    "contact_type" "contact_type" NOT NULL,
    "contact_value" TEXT NOT NULL,

    CONSTRAINT "contact_pkey" PRIMARY KEY ("contact_UUID")
);

-- CreateTable
CREATE TABLE "organization_contact" (
    "organization_UUID" UUID NOT NULL,
    "contact_UUID" UUID NOT NULL,

    CONSTRAINT "organization_contact_pkey" PRIMARY KEY ("organization_UUID","contact_UUID")
);

-- CreateTable
CREATE TABLE "employee_contact" (
    "employee_UUID" UUID NOT NULL,
    "contact_UUID" UUID NOT NULL,

    CONSTRAINT "employee_contact_pkey" PRIMARY KEY ("employee_UUID","contact_UUID")
);

-- CreateTable
CREATE TABLE "base" (
    "base_UUID" UUID NOT NULL,
    "base_name" TEXT NOT NULL,
    "base_location" TEXT NOT NULL,
    "base_status" "base_status" NOT NULL DEFAULT 'Active',

    CONSTRAINT "base_pkey" PRIMARY KEY ("base_UUID")
);

-- CreateTable
CREATE TABLE "employment_status" (
    "emp_status_UUID" UUID NOT NULL,
    "status_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "employment_status_pkey" PRIMARY KEY ("emp_status_UUID")
);

-- CreateTable
CREATE TABLE "employee" (
    "emp_UUID" UUID NOT NULL,
    "emp_number" TEXT NOT NULL,
    "f_name" TEXT NOT NULL,
    "m_initial" TEXT,
    "l_name" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "sex" "sex" NOT NULL,
    "position" TEXT NOT NULL,
    "personnel_category" TEXT NOT NULL,
    "emp_status_UUID" UUID NOT NULL,
    "base_UUID" UUID NOT NULL,
    "record_status" "record_status" NOT NULL DEFAULT 'Active',

    CONSTRAINT "employee_pkey" PRIMARY KEY ("emp_UUID")
);

-- CreateTable
CREATE TABLE "license_type" (
    "license_type_UUID" UUID NOT NULL,
    "license_type_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "license_type_pkey" PRIMARY KEY ("license_type_UUID")
);

-- CreateTable
CREATE TABLE "employee_license" (
    "emp_license_UUID" UUID NOT NULL,
    "employee_UUID" UUID NOT NULL,
    "license_type_UUID" UUID NOT NULL,
    "license_number" TEXT NOT NULL,
    "issuing_authority" TEXT NOT NULL,
    "date_issued" DATE NOT NULL,
    "expiry_date" DATE,
    "expiry_type" "expiry_type" NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "employee_license_pkey" PRIMARY KEY ("emp_license_UUID")
);

-- CreateTable
CREATE TABLE "user_account" (
    "account_UUID" UUID NOT NULL,
    "emp_UUID" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "account_status" "account_status" NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_account_pkey" PRIMARY KEY ("account_UUID")
);

-- CreateTable
CREATE TABLE "system_role" (
    "role_UUID" UUID NOT NULL,
    "role_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "system_role_pkey" PRIMARY KEY ("role_UUID")
);

-- CreateTable
CREATE TABLE "system_feature" (
    "feature_UUID" UUID NOT NULL,
    "feature_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "system_feature_pkey" PRIMARY KEY ("feature_UUID")
);

-- CreateTable
CREATE TABLE "account_role" (
    "account_UUID" UUID NOT NULL,
    "role_UUID" UUID NOT NULL,

    CONSTRAINT "account_role_pkey" PRIMARY KEY ("account_UUID","role_UUID")
);

-- CreateTable
CREATE TABLE "role_feature_access" (
    "role_UUID" UUID NOT NULL,
    "feature_UUID" UUID NOT NULL,

    CONSTRAINT "role_feature_access_pkey" PRIMARY KEY ("role_UUID","feature_UUID")
);

-- CreateIndex
CREATE UNIQUE INDEX "part_part_number_key" ON "part"("part_number");

-- CreateIndex
CREATE INDEX "inventory_status_location_UUID_idx" ON "inventory_status"("location_UUID");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_status_part_UUID_location_UUID_key" ON "inventory_status"("part_UUID", "location_UUID");

-- CreateIndex
CREATE INDEX "inventory_transaction_status_UUID_idx" ON "inventory_transaction"("status_UUID");

-- CreateIndex
CREATE INDEX "inventory_transaction_updated_by_idx" ON "inventory_transaction"("updated_by");

-- CreateIndex
CREATE INDEX "inventory_transaction_created_at_idx" ON "inventory_transaction"("created_at");

-- CreateIndex
CREATE INDEX "part_supplier_supplier_UUID_idx" ON "part_supplier"("supplier_UUID");

-- CreateIndex
CREATE INDEX "part_manufacturer_manufacturer_UUID_idx" ON "part_manufacturer"("manufacturer_UUID");

-- CreateIndex
CREATE INDEX "organization_contact_contact_UUID_idx" ON "organization_contact"("contact_UUID");

-- CreateIndex
CREATE INDEX "employee_contact_contact_UUID_idx" ON "employee_contact"("contact_UUID");

-- CreateIndex
CREATE UNIQUE INDEX "base_base_name_key" ON "base"("base_name");

-- CreateIndex
CREATE UNIQUE INDEX "employment_status_status_name_key" ON "employment_status"("status_name");

-- CreateIndex
CREATE UNIQUE INDEX "employee_emp_number_key" ON "employee"("emp_number");

-- CreateIndex
CREATE INDEX "employee_emp_status_UUID_idx" ON "employee"("emp_status_UUID");

-- CreateIndex
CREATE INDEX "employee_base_UUID_idx" ON "employee"("base_UUID");

-- CreateIndex
CREATE UNIQUE INDEX "license_type_license_type_name_key" ON "license_type"("license_type_name");

-- CreateIndex
CREATE INDEX "employee_license_employee_UUID_idx" ON "employee_license"("employee_UUID");

-- CreateIndex
CREATE INDEX "employee_license_license_type_UUID_idx" ON "employee_license"("license_type_UUID");

-- CreateIndex
CREATE INDEX "employee_license_expiry_date_idx" ON "employee_license"("expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "user_account_emp_UUID_key" ON "user_account"("emp_UUID");

-- CreateIndex
CREATE UNIQUE INDEX "user_account_username_key" ON "user_account"("username");

-- CreateIndex
CREATE UNIQUE INDEX "system_role_role_name_key" ON "system_role"("role_name");

-- CreateIndex
CREATE UNIQUE INDEX "system_feature_feature_name_key" ON "system_feature"("feature_name");

-- CreateIndex
CREATE INDEX "account_role_role_UUID_idx" ON "account_role"("role_UUID");

-- CreateIndex
CREATE INDEX "role_feature_access_feature_UUID_idx" ON "role_feature_access"("feature_UUID");

-- AddForeignKey
ALTER TABLE "inventory_status" ADD CONSTRAINT "inventory_status_part_UUID_fkey" FOREIGN KEY ("part_UUID") REFERENCES "part"("part_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_status" ADD CONSTRAINT "inventory_status_location_UUID_fkey" FOREIGN KEY ("location_UUID") REFERENCES "inventory_location"("location_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transaction" ADD CONSTRAINT "inventory_transaction_status_UUID_fkey" FOREIGN KEY ("status_UUID") REFERENCES "inventory_status"("status_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transaction" ADD CONSTRAINT "inventory_transaction_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "employee"("emp_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_organization_UUID_fkey" FOREIGN KEY ("organization_UUID") REFERENCES "organization"("organization_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer" ADD CONSTRAINT "manufacturer_organization_UUID_fkey" FOREIGN KEY ("organization_UUID") REFERENCES "organization"("organization_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_supplier" ADD CONSTRAINT "part_supplier_part_UUID_fkey" FOREIGN KEY ("part_UUID") REFERENCES "part"("part_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_supplier" ADD CONSTRAINT "part_supplier_supplier_UUID_fkey" FOREIGN KEY ("supplier_UUID") REFERENCES "supplier"("organization_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_manufacturer" ADD CONSTRAINT "part_manufacturer_part_UUID_fkey" FOREIGN KEY ("part_UUID") REFERENCES "part"("part_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_manufacturer" ADD CONSTRAINT "part_manufacturer_manufacturer_UUID_fkey" FOREIGN KEY ("manufacturer_UUID") REFERENCES "manufacturer"("organization_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_contact" ADD CONSTRAINT "organization_contact_organization_UUID_fkey" FOREIGN KEY ("organization_UUID") REFERENCES "organization"("organization_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_contact" ADD CONSTRAINT "organization_contact_contact_UUID_fkey" FOREIGN KEY ("contact_UUID") REFERENCES "contact"("contact_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_contact" ADD CONSTRAINT "employee_contact_employee_UUID_fkey" FOREIGN KEY ("employee_UUID") REFERENCES "employee"("emp_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_contact" ADD CONSTRAINT "employee_contact_contact_UUID_fkey" FOREIGN KEY ("contact_UUID") REFERENCES "contact"("contact_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_emp_status_UUID_fkey" FOREIGN KEY ("emp_status_UUID") REFERENCES "employment_status"("emp_status_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_base_UUID_fkey" FOREIGN KEY ("base_UUID") REFERENCES "base"("base_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_license" ADD CONSTRAINT "employee_license_employee_UUID_fkey" FOREIGN KEY ("employee_UUID") REFERENCES "employee"("emp_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_license" ADD CONSTRAINT "employee_license_license_type_UUID_fkey" FOREIGN KEY ("license_type_UUID") REFERENCES "license_type"("license_type_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_account" ADD CONSTRAINT "user_account_emp_UUID_fkey" FOREIGN KEY ("emp_UUID") REFERENCES "employee"("emp_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_role" ADD CONSTRAINT "account_role_account_UUID_fkey" FOREIGN KEY ("account_UUID") REFERENCES "user_account"("account_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_role" ADD CONSTRAINT "account_role_role_UUID_fkey" FOREIGN KEY ("role_UUID") REFERENCES "system_role"("role_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_feature_access" ADD CONSTRAINT "role_feature_access_role_UUID_fkey" FOREIGN KEY ("role_UUID") REFERENCES "system_role"("role_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_feature_access" ADD CONSTRAINT "role_feature_access_feature_UUID_fkey" FOREIGN KEY ("feature_UUID") REFERENCES "system_feature"("feature_UUID") ON DELETE CASCADE ON UPDATE CASCADE;
