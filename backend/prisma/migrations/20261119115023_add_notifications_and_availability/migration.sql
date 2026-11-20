-- CreateEnum
CREATE TYPE "availability_type" AS ENUM ('Available', 'Unavailable');

-- CreateEnum
CREATE TYPE "notification_category" AS ENUM ('Personnel', 'Inventory', 'Aircraft', 'Maintenance', 'System');

-- CreateEnum
CREATE TYPE "notification_severity" AS ENUM ('Info', 'Warning', 'Critical');

-- CreateEnum
CREATE TYPE "whatsapp_status" AS ENUM ('Pending', 'Sent', 'Delivered', 'Read', 'Failed');

-- AlterEnum
ALTER TYPE "contact_type" ADD VALUE 'WhatsApp';

-- AlterTable
ALTER TABLE "employee" ADD COLUMN     "availability" "availability_type" NOT NULL DEFAULT 'Available';

-- CreateTable
CREATE TABLE "notification_type" (
    "type_UUID" UUID NOT NULL,
    "event_code" TEXT NOT NULL,
    "category" "notification_category" NOT NULL,
    "description" TEXT NOT NULL,
    "default_severity" "notification_severity" NOT NULL,
    "threshold_days" INTEGER[],
    "threshold_hours" DECIMAL(10,2),
    "whatsapp_template" TEXT,
    "notify_subject" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notification_type_pkey" PRIMARY KEY ("type_UUID")
);

-- CreateTable
CREATE TABLE "notification_type_position" (
    "type_UUID" UUID NOT NULL,
    "position_UUID" UUID NOT NULL,

    CONSTRAINT "notification_type_position_pkey" PRIMARY KEY ("type_UUID","position_UUID")
);

-- CreateTable
CREATE TABLE "notification" (
    "notification_UUID" UUID NOT NULL,
    "type_UUID" UUID NOT NULL,
    "severity" "notification_severity" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("notification_UUID")
);

-- CreateTable
CREATE TABLE "notification_recipient" (
    "recipient_UUID" UUID NOT NULL,
    "notification_UUID" UUID NOT NULL,
    "emp_UUID" UUID NOT NULL,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "whatsapp_status" "whatsapp_status",
    "whatsapp_message_id" TEXT,
    "whatsapp_attempts" INTEGER NOT NULL DEFAULT 0,
    "whatsapp_error" TEXT,

    CONSTRAINT "notification_recipient_pkey" PRIMARY KEY ("recipient_UUID")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_type_event_code_key" ON "notification_type"("event_code");

-- CreateIndex
CREATE INDEX "notification_type_category_idx" ON "notification_type"("category");

-- CreateIndex
CREATE INDEX "notification_type_position_position_UUID_idx" ON "notification_type_position"("position_UUID");

-- CreateIndex
CREATE INDEX "notification_type_UUID_idx" ON "notification"("type_UUID");

-- CreateIndex
CREATE INDEX "notification_created_at_idx" ON "notification"("created_at");

-- CreateIndex
CREATE INDEX "notification_recipient_emp_UUID_read_at_idx" ON "notification_recipient"("emp_UUID", "read_at");

-- CreateIndex
CREATE INDEX "notification_recipient_whatsapp_status_idx" ON "notification_recipient"("whatsapp_status");

-- CreateIndex
CREATE INDEX "notification_recipient_whatsapp_message_id_idx" ON "notification_recipient"("whatsapp_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipient_notification_UUID_emp_UUID_key" ON "notification_recipient"("notification_UUID", "emp_UUID");

-- AddForeignKey
ALTER TABLE "notification_type_position" ADD CONSTRAINT "notification_type_position_type_UUID_fkey" FOREIGN KEY ("type_UUID") REFERENCES "notification_type"("type_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_type_position" ADD CONSTRAINT "notification_type_position_position_UUID_fkey" FOREIGN KEY ("position_UUID") REFERENCES "position"("position_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_type_UUID_fkey" FOREIGN KEY ("type_UUID") REFERENCES "notification_type"("type_UUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipient" ADD CONSTRAINT "notification_recipient_notification_UUID_fkey" FOREIGN KEY ("notification_UUID") REFERENCES "notification"("notification_UUID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipient" ADD CONSTRAINT "notification_recipient_emp_UUID_fkey" FOREIGN KEY ("emp_UUID") REFERENCES "employee"("emp_UUID") ON DELETE CASCADE ON UPDATE CASCADE;
