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
CREATE TABLE "emergency_contact" (
    "employee_UUID" UUID NOT NULL,
    "contact_UUID" UUID NOT NULL,
    "contact_person_name" TEXT NOT NULL,

    CONSTRAINT "emergency_contact_pkey" PRIMARY KEY ("employee_UUID","contact_UUID")
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
    "m_name" TEXT,
    "l_name" TEXT NOT NULL,
    "suffix" TEXT,
    "date_of_birth" DATE NOT NULL,
    "sex" "sex" NOT NULL,
    "blood_type" TEXT,
    "photo" TEXT,
    "date_hired" DATE NOT NULL,
    "department" TEXT NOT NULL,
    "personnel_category" TEXT NOT NULL,
    "record_status" "record_status" NOT NULL DEFAULT 'Active',
    "supervisor_emp_UUID" UUID,
    "base_UUID" UUID NOT NULL,
    "emp_status_UUID" UUID NOT NULL,
    "position_UUID" UUID NOT NULL,

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
CREATE TABLE "renewal_status" (
    "renewal_status_UUID" UUID NOT NULL,
    "status_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "renewal_status_pkey" PRIMARY KEY ("renewal_status_UUID")
);

-- CreateTable
CREATE TABLE "employee_license" (
    "emp_license_UUID" UUID NOT NULL,
    "emp_UUID" UUID NOT NULL,
    "license_type_UUID" UUID NOT NULL,
    "renewal_status_UUID" UUID NOT NULL,
    "license_number" TEXT NOT NULL,
    "issuing_authority" TEXT NOT NULL,
    "date_issued" DATE NOT NULL,
    "expiry_date" DATE,
    "remarks" TEXT,

    CONSTRAINT "employee_license_pkey" PRIMARY KEY ("emp_license_UUID")
);

-- CreateTable
CREATE TABLE "medical_certificate" (
    "medical_UUID" UUID NOT NULL,
    "emp_UUID" UUID NOT NULL,
    "medical_class" TEXT NOT NULL,
    "date_issued" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "clinical_hospital" TEXT NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "medical_certificate_pkey" PRIMARY KEY ("medical_UUID")
);

-- CreateTable
CREATE TABLE "training_type" (
    "training_type_UUID" UUID NOT NULL,
    "training_name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "training_type_pkey" PRIMARY KEY ("training_type_UUID")
);

-- CreateTable
CREATE TABLE "training_provider" (
    "training_provider_UUID" UUID NOT NULL,
    "provider_name" TEXT NOT NULL,

    CONSTRAINT "training_provider_pkey" PRIMARY KEY ("training_provider_UUID")
);

-- CreateTable
CREATE TABLE "training_record" (
    "training_UUID" UUID NOT NULL,
    "emp_UUID" UUID NOT NULL,
    "training_type_UUID" UUID NOT NULL,
    "training_provider_UUID" UUID NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "date_completed" DATE NOT NULL,
    "expiry_date" DATE,
    "remarks" TEXT,

    CONSTRAINT "training_record_pkey" PRIMARY KEY ("training_UUID")
);

-- CreateTable
CREATE TABLE "user_account" (
    "account_UUID" UUID NOT NULL,
    "emp_UUID" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "account_status" "account_status" NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "last_login_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_account_pkey" PRIMARY KEY ("account_UUID")
);

-- CreateTable
CREATE TABLE "position" (
    "position_UUID" UUID NOT NULL,
    "position_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "position_pkey" PRIMARY KEY ("position_UUID")
);

-- CreateTable
CREATE TABLE "system_feature" (
    "feature_UUID" UUID NOT NULL,
    "feature_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "system_feature_pkey" PRIMARY KEY ("feature_UUID")
);

-- CreateTable
CREATE TABLE "position_feature_access" (
    "position_UUID" UUID NOT NULL,
    "feature_UUID" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "position_feature_access_pkey" PRIMARY KEY ("position_UUID","feature_UUID")
);

-- CreateTable
CREATE TABLE "aircraft_status" (
    "aircraft_status_UUID" UUID NOT NULL,
    "status_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "aircraft_status_pkey" PRIMARY KEY ("aircraft_status_UUID")
);

-- CreateTable
CREATE TABLE "aircraft_type" (
    "aircraft_type_UUID" UUID NOT NULL,
    "type_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "aircraft_type_pkey" PRIMARY KEY ("aircraft_type_UUID")
);

-- CreateTable
CREATE TABLE "aircraft" (
    "aircraft_UUID" UUID NOT NULL,
    "registration" TEXT NOT NULL,
    "aircraft_status_UUID" UUID NOT NULL,
    "aircraft_type_UUID" UUID NOT NULL,
    "current_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "hours_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aircraft_pkey" PRIMARY KEY ("aircraft_UUID")
);

-- CreateTable
CREATE TABLE "ad_record" (
    "ad_UUID" UUID NOT NULL,
    "aircraft_UUID" UUID NOT NULL,
    "mechanic_emp_UUID" UUID NOT NULL,
    "faa_ad_number" TEXT NOT NULL,
    "amendment_number" TEXT,
    "subject" TEXT NOT NULL,
    "ad_category" TEXT NOT NULL,
    "effective_date" DATE NOT NULL,
    "compliance_method" TEXT NOT NULL,
    "frequency" TEXT,
    "date_of_compliance" DATE,
    "next_due_date" DATE,
    "next_due_hours" DECIMAL(10,2),
    "mechanic_license_number" TEXT NOT NULL,
    "remarks" TEXT,
    "pdf_link" TEXT,

    CONSTRAINT "ad_record_pkey" PRIMARY KEY ("ad_UUID")
);

-- CreateTable
CREATE TABLE "cpcp_task" (
    "cpcp_UUID" UUID NOT NULL,
    "aircraft_UUID" UUID NOT NULL,
    "assigned_to" UUID NOT NULL,
    "task_reference" TEXT NOT NULL,
    "description" TEXT,
    "due_hours" DECIMAL(10,2),
    "due_date" DATE,
    "last_accomplished_date" DATE,
    "last_updated" TIMESTAMPTZ(6) NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "cpcp_task_pkey" PRIMARY KEY ("cpcp_UUID")
);

-- CreateTable
CREATE TABLE "flight_status" (
    "flight_status_UUID" UUID NOT NULL,
    "status_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "flight_status_pkey" PRIMARY KEY ("flight_status_UUID")
);

-- CreateTable
CREATE TABLE "flight_type" (
    "flight_type_UUID" UUID NOT NULL,
    "type_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "flight_type_pkey" PRIMARY KEY ("flight_type_UUID")
);

-- CreateTable
CREATE TABLE "delay_category" (
    "delay_category_UUID" UUID NOT NULL,
    "category_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "delay_category_pkey" PRIMARY KEY ("delay_category_UUID")
);

-- CreateTable
CREATE TABLE "flight_sector" (
    "sector_UUID" UUID NOT NULL,
    "aircraft_UUID" UUID NOT NULL,
    "flight_status_UUID" UUID NOT NULL,
    "flight_type_UUID" UUID NOT NULL,
    "delay_category_UUID" UUID,
    "pic_emp_UUID" UUID NOT NULL,
    "sic_emp_UUID" UUID,
    "observer_emp_UUID" UUID,
    "entry_by" UUID NOT NULL,
    "flight_date" DATE NOT NULL,
    "route" TEXT NOT NULL,
    "std" TIMESTAMPTZ(6),
    "sta" TIMESTAMPTZ(6),
    "off_block" TIMESTAMPTZ(6),
    "on_block" TIMESTAMPTZ(6),
    "airborne" TIMESTAMPTZ(6),
    "touchdown" TIMESTAMPTZ(6),
    "flight_time" DECIMAL(6,2),
    "day_night" TEXT,
    "pax_count" INTEGER NOT NULL DEFAULT 0,
    "fuel_departure" DECIMAL(10,2),
    "fuel_arrival" DECIMAL(10,2),
    "fuel_used" DECIMAL(10,2),
    "fuel_unit" TEXT,
    "delay_cause" TEXT,
    "qa_check_status" TEXT,

    CONSTRAINT "flight_sector_pkey" PRIMARY KEY ("sector_UUID")
);

-- CreateTable
CREATE TABLE "fuel_transaction" (
    "fuel_transaction_UUID" UUID NOT NULL,
    "aircraft_UUID" UUID NOT NULL,
    "sector_UUID" UUID,
    "recorded_by" UUID NOT NULL,
    "issued_to" UUID NOT NULL,
    "transaction_date" DATE NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "quantity_gal" DECIMAL(10,2) NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "fuel_transaction_pkey" PRIMARY KEY ("fuel_transaction_UUID")
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
CREATE INDEX "emergency_contact_contact_UUID_idx" ON "emergency_contact"("contact_UUID");

-- CreateIndex
CREATE UNIQUE INDEX "base_base_name_key" ON "base"("base_name");

-- CreateIndex
CREATE UNIQUE INDEX "employment_status_status_name_key" ON "employment_status"("status_name");

-- CreateIndex
CREATE UNIQUE INDEX "employee_emp_number_key" ON "employee"("emp_number");

-- CreateIndex
CREATE INDEX "employee_supervisor_emp_UUID_idx" ON "employee"("supervisor_emp_UUID");

-- CreateIndex
CREATE INDEX "employee_base_UUID_idx" ON "employee"("base_UUID");

-- CreateIndex
CREATE INDEX "employee_emp_status_UUID_idx" ON "employee"("emp_status_UUID");

-- CreateIndex
CREATE INDEX "employee_position_UUID_idx" ON "employee"("position_UUID");

-- CreateIndex
CREATE UNIQUE INDEX "license_type_license_type_name_key" ON "license_type"("license_type_name");

-- CreateIndex
CREATE UNIQUE INDEX "renewal_status_status_name_key" ON "renewal_status"("status_name");

-- CreateIndex
CREATE INDEX "employee_license_emp_UUID_idx" ON "employee_license"("emp_UUID");

-- CreateIndex
CREATE INDEX "employee_license_license_type_UUID_idx" ON "employee_license"("license_type_UUID");

-- CreateIndex
CREATE INDEX "employee_license_renewal_status_UUID_idx" ON "employee_license"("renewal_status_UUID");

-- CreateIndex
CREATE INDEX "employee_license_expiry_date_idx" ON "employee_license"("expiry_date");

-- CreateIndex
CREATE INDEX "medical_certificate_emp_UUID_idx" ON "medical_certificate"("emp_UUID");

-- CreateIndex
CREATE INDEX "medical_certificate_expiry_date_idx" ON "medical_certificate"("expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "training_type_training_name_key" ON "training_type"("training_name");

-- CreateIndex
CREATE UNIQUE INDEX "training_provider_provider_name_key" ON "training_provider"("provider_name");

-- CreateIndex
CREATE INDEX "training_record_emp_UUID_idx" ON "training_record"("emp_UUID");

-- CreateIndex
CREATE INDEX "training_record_training_type_UUID_idx" ON "training_record"("training_type_UUID");

-- CreateIndex
CREATE INDEX "training_record_training_provider_UUID_idx" ON "training_record"("training_provider_UUID");

-- CreateIndex
CREATE INDEX "training_record_expiry_date_idx" ON "training_record"("expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "user_account_emp_UUID_key" ON "user_account"("emp_UUID");

-- CreateIndex
CREATE UNIQUE INDEX "user_account_username_key" ON "user_account"("username");

-- CreateIndex
CREATE UNIQUE INDEX "position_position_name_key" ON "position"("position_name");

-- CreateIndex
CREATE UNIQUE INDEX "system_feature_feature_name_key" ON "system_feature"("feature_name");

-- CreateIndex
CREATE INDEX "position_feature_access_feature_UUID_idx" ON "position_feature_access"("feature_UUID");

-- CreateIndex
CREATE UNIQUE INDEX "aircraft_status_status_name_key" ON "aircraft_status"("status_name");

-- CreateIndex
CREATE UNIQUE INDEX "aircraft_type_type_name_key" ON "aircraft_type"("type_name");

-- CreateIndex
CREATE UNIQUE INDEX "aircraft_registration_key" ON "aircraft"("registration");

-- CreateIndex
CREATE INDEX "aircraft_aircraft_status_UUID_idx" ON "aircraft"("aircraft_status_UUID");

-- CreateIndex
CREATE INDEX "aircraft_aircraft_type_UUID_idx" ON "aircraft"("aircraft_type_UUID");

-- CreateIndex
CREATE INDEX "ad_record_aircraft_UUID_idx" ON "ad_record"("aircraft_UUID");

-- CreateIndex
CREATE INDEX "ad_record_mechanic_emp_UUID_idx" ON "ad_record"("mechanic_emp_UUID");

-- CreateIndex
CREATE INDEX "ad_record_next_due_date_idx" ON "ad_record"("next_due_date");

-- CreateIndex
CREATE INDEX "cpcp_task_aircraft_UUID_idx" ON "cpcp_task"("aircraft_UUID");

-- CreateIndex
CREATE INDEX "cpcp_task_assigned_to_idx" ON "cpcp_task"("assigned_to");

-- CreateIndex
CREATE INDEX "cpcp_task_due_date_idx" ON "cpcp_task"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "flight_status_status_name_key" ON "flight_status"("status_name");

-- CreateIndex
CREATE UNIQUE INDEX "flight_type_type_name_key" ON "flight_type"("type_name");

-- CreateIndex
CREATE UNIQUE INDEX "delay_category_category_name_key" ON "delay_category"("category_name");

-- CreateIndex
CREATE INDEX "flight_sector_aircraft_UUID_idx" ON "flight_sector"("aircraft_UUID");

-- CreateIndex
CREATE INDEX "flight_sector_flight_date_idx" ON "flight_sector"("flight_date");

-- CreateIndex
CREATE INDEX "flight_sector_pic_emp_UUID_idx" ON "flight_sector"("pic_emp_UUID");

-- CreateIndex
CREATE INDEX "flight_sector_flight_status_UUID_idx" ON "flight_sector"("flight_status_UUID");

-- CreateIndex
CREATE INDEX "flight_sector_flight_type_UUID_idx" ON "flight_sector"("flight_type_UUID");

-- CreateIndex
CREATE INDEX "fuel_transaction_aircraft_UUID_idx" ON "fuel_transaction"("aircraft_UUID");

-- CreateIndex
CREATE INDEX "fuel_transaction_sector_UUID_idx" ON "fuel_transaction"("sector_UUID");

-- CreateIndex
CREATE INDEX "fuel_transaction_recorded_by_idx" ON "fuel_transaction"("recorded_by");

-- CreateIndex
CREATE INDEX "fuel_transaction_issued_to_idx" ON "fuel_transaction"("issued_to");

-- CreateIndex
CREATE INDEX "fuel_transaction_transaction_date_idx" ON "fuel_transaction"("transaction_date");

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
ALTER TABLE "emergency_contact" ADD CONSTRAINT "emergency_contact_employee_UUID_fkey" FOREIGN KEY ("employee_UUID") REFERENCES "employee"("emp_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contact" ADD CONSTRAINT "emergency_contact_contact_UUID_fkey" FOREIGN KEY ("contact_UUID") REFERENCES "contact"("contact_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_supervisor_emp_UUID_fkey" FOREIGN KEY ("supervisor_emp_UUID") REFERENCES "employee"("emp_UUID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_base_UUID_fkey" FOREIGN KEY ("base_UUID") REFERENCES "base"("base_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_emp_status_UUID_fkey" FOREIGN KEY ("emp_status_UUID") REFERENCES "employment_status"("emp_status_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_position_UUID_fkey" FOREIGN KEY ("position_UUID") REFERENCES "position"("position_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_license" ADD CONSTRAINT "employee_license_emp_UUID_fkey" FOREIGN KEY ("emp_UUID") REFERENCES "employee"("emp_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_license" ADD CONSTRAINT "employee_license_license_type_UUID_fkey" FOREIGN KEY ("license_type_UUID") REFERENCES "license_type"("license_type_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_license" ADD CONSTRAINT "employee_license_renewal_status_UUID_fkey" FOREIGN KEY ("renewal_status_UUID") REFERENCES "renewal_status"("renewal_status_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_certificate" ADD CONSTRAINT "medical_certificate_emp_UUID_fkey" FOREIGN KEY ("emp_UUID") REFERENCES "employee"("emp_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_record" ADD CONSTRAINT "training_record_emp_UUID_fkey" FOREIGN KEY ("emp_UUID") REFERENCES "employee"("emp_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_record" ADD CONSTRAINT "training_record_training_type_UUID_fkey" FOREIGN KEY ("training_type_UUID") REFERENCES "training_type"("training_type_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_record" ADD CONSTRAINT "training_record_training_provider_UUID_fkey" FOREIGN KEY ("training_provider_UUID") REFERENCES "training_provider"("training_provider_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_account" ADD CONSTRAINT "user_account_emp_UUID_fkey" FOREIGN KEY ("emp_UUID") REFERENCES "employee"("emp_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_feature_access" ADD CONSTRAINT "position_feature_access_position_UUID_fkey" FOREIGN KEY ("position_UUID") REFERENCES "position"("position_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_feature_access" ADD CONSTRAINT "position_feature_access_feature_UUID_fkey" FOREIGN KEY ("feature_UUID") REFERENCES "system_feature"("feature_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aircraft" ADD CONSTRAINT "aircraft_aircraft_status_UUID_fkey" FOREIGN KEY ("aircraft_status_UUID") REFERENCES "aircraft_status"("aircraft_status_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aircraft" ADD CONSTRAINT "aircraft_aircraft_type_UUID_fkey" FOREIGN KEY ("aircraft_type_UUID") REFERENCES "aircraft_type"("aircraft_type_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_record" ADD CONSTRAINT "ad_record_aircraft_UUID_fkey" FOREIGN KEY ("aircraft_UUID") REFERENCES "aircraft"("aircraft_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_record" ADD CONSTRAINT "ad_record_mechanic_emp_UUID_fkey" FOREIGN KEY ("mechanic_emp_UUID") REFERENCES "employee"("emp_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpcp_task" ADD CONSTRAINT "cpcp_task_aircraft_UUID_fkey" FOREIGN KEY ("aircraft_UUID") REFERENCES "aircraft"("aircraft_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpcp_task" ADD CONSTRAINT "cpcp_task_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "employee"("emp_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_sector" ADD CONSTRAINT "flight_sector_aircraft_UUID_fkey" FOREIGN KEY ("aircraft_UUID") REFERENCES "aircraft"("aircraft_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_sector" ADD CONSTRAINT "flight_sector_flight_status_UUID_fkey" FOREIGN KEY ("flight_status_UUID") REFERENCES "flight_status"("flight_status_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_sector" ADD CONSTRAINT "flight_sector_flight_type_UUID_fkey" FOREIGN KEY ("flight_type_UUID") REFERENCES "flight_type"("flight_type_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_sector" ADD CONSTRAINT "flight_sector_delay_category_UUID_fkey" FOREIGN KEY ("delay_category_UUID") REFERENCES "delay_category"("delay_category_UUID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_sector" ADD CONSTRAINT "flight_sector_pic_emp_UUID_fkey" FOREIGN KEY ("pic_emp_UUID") REFERENCES "employee"("emp_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_sector" ADD CONSTRAINT "flight_sector_sic_emp_UUID_fkey" FOREIGN KEY ("sic_emp_UUID") REFERENCES "employee"("emp_UUID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_sector" ADD CONSTRAINT "flight_sector_observer_emp_UUID_fkey" FOREIGN KEY ("observer_emp_UUID") REFERENCES "employee"("emp_UUID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_sector" ADD CONSTRAINT "flight_sector_entry_by_fkey" FOREIGN KEY ("entry_by") REFERENCES "employee"("emp_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transaction" ADD CONSTRAINT "fuel_transaction_aircraft_UUID_fkey" FOREIGN KEY ("aircraft_UUID") REFERENCES "aircraft"("aircraft_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transaction" ADD CONSTRAINT "fuel_transaction_sector_UUID_fkey" FOREIGN KEY ("sector_UUID") REFERENCES "flight_sector"("sector_UUID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transaction" ADD CONSTRAINT "fuel_transaction_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "employee"("emp_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transaction" ADD CONSTRAINT "fuel_transaction_issued_to_fkey" FOREIGN KEY ("issued_to") REFERENCES "employee"("emp_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;
