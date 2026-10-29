-- Optional data-integrity rules that Prisma cannot express in schema.prisma.
-- Paste this at the END of the generated prisma/migrations/<timestamp>_init/migration.sql.

ALTER TABLE "part"
  ADD CONSTRAINT "part_min_stock_level_nonnegative" CHECK ("min_stock_level" >= 0);

ALTER TABLE "inventory_status"
  ADD CONSTRAINT "inventory_status_quantity_nonnegative" CHECK ("current_quantity" >= 0);

ALTER TABLE "inventory_transaction"
  ADD CONSTRAINT "inventory_transaction_change_nonzero" CHECK ("quantity_change" <> 0);

ALTER TABLE "employee_license"
  ADD CONSTRAINT "employee_license_expiry_after_issue"
  CHECK ("expiry_date" IS NULL OR "expiry_date" >= "date_issued");
