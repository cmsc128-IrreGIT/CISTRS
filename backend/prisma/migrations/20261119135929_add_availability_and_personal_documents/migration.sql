-- CreateTable
CREATE TABLE "employee_availability" (
    "availability_UUID" UUID NOT NULL,
    "emp_UUID" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "availability_type" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_availability_pkey" PRIMARY KEY ("availability_UUID")
);

-- CreateTable
CREATE TABLE "personal_document" (
    "document_UUID" UUID NOT NULL,
    "emp_UUID" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reference" TEXT,
    "date_issued" DATE NOT NULL,
    "expiry_date" DATE,
    "renewal_date" DATE,
    "file_path" TEXT,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_document_pkey" PRIMARY KEY ("document_UUID")
);

-- CreateIndex
CREATE INDEX "employee_availability_emp_UUID_idx" ON "employee_availability"("emp_UUID");

-- CreateIndex
CREATE INDEX "employee_availability_date_idx" ON "employee_availability"("date");

-- CreateIndex
CREATE UNIQUE INDEX "employee_availability_emp_UUID_date_key" ON "employee_availability"("emp_UUID", "date");

-- CreateIndex
CREATE INDEX "personal_document_emp_UUID_idx" ON "personal_document"("emp_UUID");

-- CreateIndex
CREATE INDEX "personal_document_kind_idx" ON "personal_document"("kind");

-- CreateIndex
CREATE INDEX "personal_document_expiry_date_idx" ON "personal_document"("expiry_date");

-- AddForeignKey
ALTER TABLE "employee_availability" ADD CONSTRAINT "employee_availability_emp_UUID_fkey" FOREIGN KEY ("emp_UUID") REFERENCES "employee"("emp_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_document" ADD CONSTRAINT "personal_document_emp_UUID_fkey" FOREIGN KEY ("emp_UUID") REFERENCES "employee"("emp_UUID") ON DELETE CASCADE ON UPDATE CASCADE;
