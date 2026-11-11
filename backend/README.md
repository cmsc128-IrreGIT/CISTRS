# CISTRS Backend Database Setup

This guide explains how to set up the **local PostgreSQL database, Prisma connection, tables, and seed data** for the CISTRS project.

Each team member should complete these steps on their own laptop.

The goal is for every developer to have:

```text
Your Laptop
│
├── PostgreSQL 18
│   └── cistrs database
│       ├── 38 CISTRS tables   (created by Prisma migrations)
│       └── Seed data          (loaded by the Prisma seeder)
│
└── CISTRS Backend
    └── Prisma 7.10.0
```

All team members use their **own local PostgreSQL server**. Prisma migrations keep the database structure consistent. The seeder loads the same starting data for everyone.

---

# Schema / ERD
![CISTRS Schema/ERD](schema.svg)

---

# 1. Install PostgreSQL

Download and install PostgreSQL from the official PostgreSQL website.

During installation, PostgreSQL will ask you to configure the database server.

### IMPORTANT: PostgreSQL Password

When PostgreSQL asks you to create a password for the default `postgres` user:

> **Set the password to `password`**

For this project, use the following settings:

```text
Username: postgres
Password: password
Port:     5432
Host:     localhost
```

The password is standardized for the CISTRS development environment so that every team member can use the same local configuration.

> **Security note:** `password` is only for local development for this school project. Never use this password for a production database or publicly accessible server.

---

# 2. Open pgAdmin 4

After installing PostgreSQL, open **pgAdmin 4**.

You should see your PostgreSQL server under:

```text
Servers
└── PostgreSQL 18
```

If pgAdmin asks for your PostgreSQL password, enter:

```text
password
```

---

# 3. Check the PostgreSQL Server Settings

Right-click:

```text
PostgreSQL 18
```

Then select:

```text
Properties → Connection
```

Make sure the settings are:

```text
Host:     localhost
Port:     5432
Username: postgres
```

If these settings are correct, your local PostgreSQL server is ready.

---

# 4. Create the CISTRS Database

In pgAdmin:

1. Expand your PostgreSQL server.
2. Right-click **Databases**.
3. Select **Create → Database**.
4. Set the database name to:

```text
cistrs
```

5. Set the owner to:

```text
postgres
```

6. Click **Save**.

You should now see:

```text
Databases
└── cistrs
```

### Do not create tables manually

**Do not manually create CISTRS tables using pgAdmin.**

Prisma creates and manages the database structure through migrations.

**Do not insert seed data manually either.** The Prisma seeder loads it for you (Step 10).

---

# 5. Install the Backend Dependencies

Open a terminal inside:

```text
CISTRS/backend
```

Run:

```bash
npm install
```

This installs everything the backend needs, including:

- Prisma 7.10.0 and the PostgreSQL driver adapter
- `tsx`, which runs the seeder
- `bcryptjs`, which hashes the seeded passwords

### Requirement

Use **Node.js 22.12 or newer**. Check your version:

```bash
node -v
```

### Do not upgrade Prisma

Prisma may print `Update available 7.10.0 -> 8.0.0-rc...`. **Ignore it.** The whole team stays on **7.10.0**. A mixed-version team breaks migrations and the generated client.

---

# 6. Configure the Backend `.env`

Inside the CISTRS backend folder, create a file named:

```text
.env
```

Add:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/cistrs"
SEED_DEFAULT_PASSWORD="password"
```

`DATABASE_URL` tells Prisma to connect to:

```text
Host:     localhost
Port:     5432
Username: postgres
Password: password
Database: cistrs
```

`SEED_DEFAULT_PASSWORD` is the login password for **every seeded user account**. The seeder hashes it with bcrypt before saving it. The seeder stops with an error if this variable is missing.

> **Security note:** Use `password` for local development only. Never use it in production.

### Important

The `.env` file is local to your laptop.

**Do not commit `.env` to GitHub.**

Every team member should have their own local `.env` file.

---

# 7. Test the PostgreSQL Connection

Run this inside `CISTRS/backend`:

```bash
npx prisma migrate status
```

If the connection is successful, Prisma should display something similar to:

```text
Datasource "db": PostgreSQL database "cistrs", schema "public" at "localhost:5432"
```

Then it reports one of these messages. **All of them mean the connection works:**

| Message                                            | Meaning                                               |
| -------------------------------------------------- | ----------------------------------------------------- |
| `Following migration(s) have not yet been applied` | Connected. The tables do not exist yet. Go to Step 8. |
| `Database schema is up to date!`                   | Connected. The tables already exist.                  |

### If the connection fails

| Error                                               | Fix                                                          |
| --------------------------------------------------- | ------------------------------------------------------------ |
| `P1001: Can't reach database server`                | Start PostgreSQL. Check the host and port in `DATABASE_URL`. |
| `P1000: Authentication failed`                      | Check the username and password in `DATABASE_URL`.           |
| `P1003: Database does not exist`                    | Create the `cistrs` database in pgAdmin (Step 4).            |
| `Cannot resolve environment variable: DATABASE_URL` | Create the `.env` file inside `backend` (Step 6).            |

### Do not use `npx prisma db pull`

`db pull` rewrites `prisma/schema.prisma` from whatever it finds in your database. After the tables exist, it **overwrites the team's schema file** and removes the enums, relation names, and table mappings.

Use `npx prisma migrate status` to test the connection instead.

---

# 8. Create the Database Tables

Run this inside `CISTRS/backend`:

```bash
npx prisma migrate dev
npx prisma generate
```

The repository contains two migrations, applied in this order:

1. `prisma/migrations/20261106175237_init/` creates the CISTRS database structure.
2. `prisma/migrations/20261111120000_integrity_audit_hardening/` adds data-integrity rules, audit columns and the `personnel_category` lookup table (see "Database Rules and Audit Columns" below).

Together they create:

- 38 CISTRS tables
- 6 enum types
- All indexes and foreign keys
- Prisma's own `_prisma_migrations` table, which tracks what has been applied

You should **not** manually create those tables in pgAdmin.

The migration files in the repository keep everyone's database structure consistent.

### If Prisma reports drift

You may see `Drift detected: Your database schema is not in sync with your migration history`. This happens when your local database holds old tables from earlier experiments (for example the old `Test` table).

Reset your local database, then continue:

```bash
npx prisma migrate reset
```

Type `y` to confirm. This **deletes all data** in your local `cistrs` database.

### Never edit an applied migration

Never change a migration file after you commit it. Create a new migration instead (see "Changing the Schema" below).

---

# 9. Generate Prisma Client

Run:

```bash
npx prisma generate
```

This generates the Prisma Client used by the CISTRS backend. It writes the client to `src/generated/prisma/`.

### Prisma 7 does not generate automatically

`npx prisma migrate dev` does **not** run `generate` for you in Prisma 7. Run `npx prisma generate`:

- After every fresh clone
- After every `schema.prisma` change
- Before you run the seeder (the seeder imports the generated client)

---

# 10. Seed the Database

Run:

```bash
npx prisma db seed
```

Prisma runs `tsx src/seeder/seed.ts`. You should see:

```text
Seeding CISTRS database...
  BASE                     +3
  EMPLOYMENT_STATUS        +5
  LICENSE_TYPE             +6
  RENEWAL_STATUS           +5
  POSITION                 +8
  SYSTEM_FEATURE           +9
  INVENTORY_LOCATION       +4
  PART                     +8
  CONTACT                  +22
  ORGANIZATION             +6
  SUPPLIER                 +4
  MANUFACTURER             +4
  ORGANIZATION_CONTACT     +6
  PART_SUPPLIER            +9
  PART_MANUFACTURER        +8
  EMPLOYEE                 +8
  EMPLOYEE_CONTACT         +16
  EMPLOYEE_LICENSE         +10
  USER_ACCOUNT             +8
  POSITION_FEATURE_ACCESS  +33
  INVENTORY_STATUS         +16
  INVENTORY_TRANSACTION   +21
Seed complete. Verification passed.
```

### What the seeder does

1. Reads `src/seeder/seed.json`.
2. Inserts the tables in foreign-key order, parents first.
3. Runs everything in **one transaction**. If one insert fails, Prisma rolls back all of them.
4. Replaces the `REPLACE_WITH_REAL_BCRYPT_HASH` placeholder with a real bcrypt hash of `SEED_DEFAULT_PASSWORD`.
5. Verifies the result:
    - Every table holds at least the rows in `seed.json`.
    - Every `inventory_status.current_quantity` equals the sum of its `inventory_transaction.quantity_change` rows.

### Prisma 7 does not seed automatically

`npx prisma migrate dev` and `npx prisma migrate reset` do **not** run the seeder in Prisma 7. Run `npx prisma db seed` yourself.

### Run the seeder again safely

The seeder skips rows that already exist. A second run inserts nothing and changes nothing.

To reload edited values or start clean, reset the database (see "Reset Your Local Database" below).

### Seeded data

| Table                     | Rows | Table                     | Rows |
| ------------------------- | ---: | ------------------------- | ---: |
| `base`                    |    3 | `part`                    |    8 |
| `employment_status`       |    5 | `inventory_location`      |    4 |
| `personnel_category`      |    5 | `part_supplier`           |    9 |
| `employee`                |    8 | `part_manufacturer`       |    8 |
| `contact`                 |   24 | `inventory_status`        |   16 |
| `employee_contact`        |   16 | `inventory_transaction`   |   21 |
| `license_type`            |    6 | `organization_contact`    |    6 |
| `renewal_status`          |    5 | `user_account`            |    8 |
| `employee_license`        |   10 | `position`                |    8 |
| `organization`            |    6 | `system_feature`          |    9 |
| `supplier`                |    4 | `position_feature_access` |   33 |
| `manufacturer`            |    4 |                           |      |

Tables added by the updated schema (`emergency_contact`, `medical_certificate`, `training_*`, `aircraft*`, `ad_record`, `cpcp_task`, `flight_*`, `delay_category`, `fuel_transaction`) are present in `seed.json` as empty arrays. The seeder skips empty tables, so add rows there when demo data is needed.

### Seeded user accounts

Access is **position-based**: an employee holds one position, and the position grants features. Every account uses the password from `SEED_DEFAULT_PASSWORD` in your `.env`.

| Username           | Position                 | Account status |
| ------------------ | ------------------------ | -------------- |
| `adrian.reyes`     | President / CEO          | Active         |
| `marissa.santos`   | Accountable Manager      | Active         |
| `ramon.villanueva` | Chief Aircraft Mechanic  | Active         |
| `angela.cruz`      | First Officer            | Active         |
| `patricia.flores`  | Quality Manager          | Active         |
| `joshua.garcia`    | Inventory Officer        | Active         |
| `nicole.bautista`  | Captain                  | Active         |
| `daniel.mendoza`   | Assistant Safety Manager | **Inactive**   |

Use `daniel.mendoza` to test that your login rejects inactive accounts.

> **Do not edit field names in `seed.json`.** The seeder and the schema share the same column names. Edit values freely, but keep every key.

---

# 11. Verify the Database with Prisma Studio

Run:
```bash
npx prisma migrate status
```

The migration status should indicate that the database is up to date.

```bash
npx prisma studio
```

Prisma will provide a local URL in the terminal.

Open that URL in your browser.

You should be able to see the CISTRS database models/tables managed by Prisma, now **with data**:

- `Employee` shows 8 rows.
- `Part` shows 8 rows.
- `InventoryTransaction` shows 21 rows.

### Optional: check in pgAdmin

1. Expand `cistrs → Schemas → public → Tables`.
2. Right-click **Tables** and select **Refresh**.
3. Confirm you see 38 CISTRS tables plus `_prisma_migrations`.

Look at the tables, but **do not edit their structure in pgAdmin**.

## Reset Your Local Database

Use this procedure when updating from the previous CISTRS database structure or when you need to completely reload your local database.

**WARNING: This operation deletes all existing data in your local `cistrs` database. Make sure you do not have records that need to be preserved.**

### For developers with an existing CISTRS database

First, pull the latest changes from GitHub:

```bash
git pull
npm install
```

Then run:

```bash
npx prisma migrate reset
```

Confirm the reset when prompted.

This command:

1. Drops the existing database schema.
2. Recreates the schema.
3. Applies the migration files currently available in the repository.

Next, generate Prisma Client:

```bash
npx prisma generate
```

Finally, load the updated seed data:

```bash
npx prisma db seed
```

Verify the migration status:

```bash
npx prisma migrate status
```

Your local database should now have the latest CISTRS structure and seed data.

### For developers setting up a fresh database

If you have just created your local `cistrs` database and it has no previous CISTRS tables, run:

```bash
npx prisma migrate dev
npx prisma generate
npx prisma db seed
```

**Important reminders:**

- Do not manually delete the migration folders.
- Do not create another `init` migration.
- Do not run `npx prisma migrate dev --name init` when setting up your database as a teammate.
- Always use the migration files committed to the repository.
- Never run `migrate reset` on a shared or production database.

---

## Changing the Schema

Follow this workflow whenever someone modifies `prisma/schema.prisma`.

### Developer responsible for the schema changes

1. Edit `prisma/schema.prisma`.
2. Update `src/seeder/seed.json` and `src/seeder/seed.ts` if the changes affect seed data.
3. Create a migration:

   ```bash
   npx prisma migrate dev --name describe_your_changes
   ```

4. Generate Prisma Client:

   ```bash
   npx prisma generate
   ```

5. Test the migration and seeder.
6. Commit the following files:

   - `prisma/schema.prisma`
   - The new migration folder
   - Updated seeder files, if applicable

### Every teammate after pulling schema changes

```bash
git pull
npm install
npx prisma migrate dev
npx prisma generate
```

If the changes require a complete database reset, follow the **Reset Your Local Database** instructions instead.

**Never edit an already-applied migration file. Create a new migration for future schema changes.**

---

# 12. Start the Backend Server

Run this inside './backend':

```bash
npm run dev
```

The backend should start on:

```text
http://localhost:5000
```

You should see:

```text
CISTRS backend running on http://localhost:5000
```

---

# 13. Test the Backend

Open:

```text
http://localhost:5000/api/health
```

A successful response should look like:

```json
{
    "status": "ok",
    "message": "CISTRS backend is running!"
}
```

If you see this response, your local backend server is running successfully.

> **Health check limit:** This response proves the server runs. It does not prove the database connects. Step 7 (`migrate status`) and Step 11 (Prisma Studio) prove the database connection.

---

# 14. Setup Checklist

Before considering the setup complete, make sure:

- [ ] PostgreSQL installed
- [ ] PostgreSQL 18 server running
- [ ] PostgreSQL username is `postgres`
- [ ] PostgreSQL password is `password`
- [ ] PostgreSQL port is `5432`
- [ ] pgAdmin 4 opens successfully
- [ ] `cistrs` database created
- [ ] Node.js 22.12 or newer installed
- [ ] `npm install` completed inside `backend`
- [ ] `.env` created inside `backend`
- [ ] `DATABASE_URL` configured correctly
- [ ] `SEED_DEFAULT_PASSWORD` configured
- [ ] `npx prisma migrate status` successfully connects to PostgreSQL
- [ ] Prisma migrations applied (`npx prisma migrate dev`)
- [ ] Prisma Client generated (`npx prisma generate`)
- [ ] Database seeded (`npx prisma db seed`) and "Verification passed" appeared
- [ ] Prisma Studio shows data in the tables
- [ ] Backend starts with `npm run dev`
- [ ] `/api/health` responds successfully

If all of these are complete, your laptop is ready for CISTRS backend development.

---

# Project Files

These are the database files in the repository:

```text
backend/
├── prisma/
│   ├── schema.prisma                    # All 38 models, enums, relations, indexes
│   ├── checks.sql                       # Pointer only: the CHECK rules are now in a migration
│   └── migrations/
│       ├── 20261106175237_init/         # Creates the tables
│       └── 20261111120000_integrity_audit_hardening/  # Rules, audit columns, personnel_category
├── src/
│   ├── generated/prisma/                # Created by `npx prisma generate`
│   ├── seeder/
│   │   ├── seed.ts                      # The seeder
│   │   └── seed.json                    # Seed data
│   └── server.ts
├── prisma.config.ts                     # Database URL, migrations path, seed command
├── .env                                 # Local only. Never commit.
└── package.json
```

Prisma reads its settings from `prisma.config.ts`. The file name matters: Prisma 7 only loads `prisma.config.ts` automatically.

---

# Common Commands

Run these inside `CISTRS/backend`.

| Task                                               | Command                     |
| -------------------------------------------------- | --------------------------- |
| Check the database connection and migration status | `npx prisma migrate status` |
| Apply migrations to your local database            | `npx prisma migrate dev`    |
| Regenerate Prisma Client                           | `npx prisma generate`       |
| Load the seed data (safe to repeat)                | `npx prisma db seed`        |
| Browse the data                                    | `npx prisma studio`         |
| Check TypeScript types                             | `npx tsc --noEmit`          |

---

# Reset Your Local Database

Use this when your local data gets messy, or after you edit `seed.json` values.

> **Warning:** This **deletes all data** in your local `cistrs` database. Run it on your own laptop only.

Run:

```bash
npx prisma migrate reset
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
```

This drops the tables, replays every migration, and reloads the seed data.

---

# Changing the Schema

Follow this workflow when someone edits `prisma/schema.prisma`.

### The developer who changes the schema

1. Edit `prisma/schema.prisma`.
2. Create a migration with a clear name:

    ```bash
    npx prisma migrate dev --name add_aircraft_table
    ```

3. Regenerate the client:

    ```bash
    npx prisma generate
    ```

4. If the change affects seed data, update `src/seeder/seed.json` and `src/seeder/seed.ts` in the same commit.
5. Commit the schema, the new migration folder, and any seed changes.

### Every teammate after pulling

```bash
git pull
npm install
npx prisma migrate dev
npx prisma generate
```

Run `npx prisma migrate reset` followed by `npx prisma db seed` if the seed data changed.

**Never run `migrate reset` on a shared or production database.**

---

# Database Rules and Audit Columns

The migration `20261111120000_integrity_audit_hardening` is applied by `npx prisma migrate dev` like any other. It does not change any API.

**Audit columns.** `created_at` and `updated_at` exist on `employee`, `part`, `inventory_status`, `employee_license`, `medical_certificate`, `training_record`, `aircraft`, `ad_record`, `flight_sector` and `fuel_transaction` (`cpcp_task` gets `created_at` beside its existing `last_updated`). `employee` also has `created_by` and `updated_by` (nullable employee IDs).
For rows that existed before the migration, the timestamps hold the migration time and `created_by` / `updated_by` are empty.

**`personnel_category`** is now a lookup table. `employee.personnel_category_UUID` points to it, and `GET /api/personnel/employees` still returns `personnel_category` as the category name.

**Uniqueness**

- `contact`: one row per `(contact_type, contact_value)`.
- `organization`: one row per `(organization_name, organization_location)`.
- `inventory_location`: one row per `(location_name, storage_area)`.
- `employee_license`: one row per `(emp_UUID, license_type_UUID, license_number)`.
- `cpcp_task`: one row per `(aircraft_UUID, task_reference)`.

A duplicate insert is answered with `409`.

**CHECK constraints** (Prisma cannot express these in `schema.prisma`):

- `part.min_stock_level`, `inventory_status.current_quantity` and `aircraft.current_hours` are never negative; `inventory_transaction.quantity_change` is never zero.
- `employee_license`, `medical_certificate` and `training_record`: expiry is never before issue/completion.
- `employee`: hired on or after the date of birth; never their own supervisor; `blood_type` is one of A+, A-, B+, B-, AB+, AB-, O+, O-.
- `flight_sector`: passengers, flight time and fuel are never negative; `day_night` is `Day` or `Night`.
- `fuel_transaction.quantity_gal` is greater than zero.

If you change a rule, add a **new** migration. Never edit a migration that has been applied.

**Existing database?** Run `npx prisma migrate dev`. The migration fails (and changes nothing) if existing rows already break a new rule; the error names the row. To also pick up the corrected seed data, run `npx prisma migrate reset` and then `npx prisma db seed`.

---

# Troubleshooting

| Symptom                                                | Fix                                                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `Cannot resolve environment variable: DATABASE_URL`    | Create `.env` inside `backend`. Run commands from the `backend` folder.             |
| `SEED_DEFAULT_PASSWORD is not set`                     | Add `SEED_DEFAULT_PASSWORD` to `.env`.                                              |
| `Cannot find module '../generated/prisma/client.js'`   | Run `npx prisma generate`.                                                          |
| `relation "part" does not exist` while seeding         | Run `npx prisma migrate dev` first.                                                 |
| `Drift detected` during `migrate dev`                  | Run `npx prisma migrate reset`, then repeat Steps 9 and 10.                         |
| `P1001: Can't reach database server`                   | Start the PostgreSQL service. Check the port in `DATABASE_URL`.                     |
| `P1000: Authentication failed`                         | Check the password in `DATABASE_URL`. It must match your PostgreSQL password.       |
| `Foreign key constraint violated` while seeding        | Undo any edits to IDs in `seed.json`. Every foreign key must match an existing row. |
| `Seed verification failed: ... quantity ... != ledger` | Make each `current_quantity` equal the sum of its `quantity_change` rows.           |
| Edited `seed.json` values do not appear                | The seeder skips existing rows. Run the reset steps above.                          |
| Seeded users cannot log in                             | Reset and reseed after you set `SEED_DEFAULT_PASSWORD`.                             |
| Prisma changed my `schema.prisma` unexpectedly         | You ran `db pull`. Restore the file with `git checkout prisma/schema.prisma`.       |

---

# Database Architecture

Each developer has their own local database:

```text
Kenny's Laptop
└── PostgreSQL
    └── cistrs


Teammate A's Laptop
└── PostgreSQL
    └── cistrs


Teammate B's Laptop
└── PostgreSQL
    └── cistrs
```

The databases are separate from each other.

Prisma migrations keep their database structures synchronized with the project. The seeder gives every developer the same starting data.

```text
GitHub Repository
       │
       ├── Prisma Schema        (prisma/schema.prisma)
       ├── Prisma Migrations    (prisma/migrations/)
       └── Seeder + Seed Data   (src/seeder/seed.ts, src/seeder/seed.json)
              │
       ┌──────┼──────┐
       ↓      ↓      ↓
    Local   Local   Local
     DB      DB      DB
```

**Do not commit your `.env` file or your local PostgreSQL database.**

Only these files should be shared through the repository:

- The Prisma schema
- The Prisma migration files
- The seeder and seed data

---

# Production Notes

- Deploy migrations with `npx prisma migrate deploy`. Never run `migrate dev` or `migrate reset` on a production database.
- Do **not** run the seeder in production. It creates demo employees, demo accounts, and one shared password.
- Create the real roles, features, and first admin account with a separate, reviewed script.
- Store `DATABASE_URL` in your host's secret manager. Do not reuse the local `password`.
