# CISTRS Backend Database Setup

This guide explains how to set up the **local PostgreSQL database and Prisma connection** for the CISTRS project.

Each team member should complete these steps on their own laptop.

The goal is for every developer to have:

```text
Your Laptop
│
├── PostgreSQL 18
│   └── cistrs database
│
└── CISTRS Backend
    └── Prisma 7
```

All team members use their **own local PostgreSQL server**, but the database structure is kept consistent through Prisma migrations.

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

Prisma will create and manage the database structure through migrations.

---

# 5. Configure the Backend `.env`

Inside the CISTRS backend folder, create a file named:

```text
.env
```

Add:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/cistrs"
```

This tells Prisma to connect to:

```text
Host:     localhost
Port:     5432
Username: postgres
Password: password
Database: cistrs
```

### Important

The `.env` file is local to your laptop.

**Do not commit `.env` to GitHub.**

Every team member should have their own local `.env` file.

---

# 6. Test the PostgreSQL Connection

Open a terminal inside:

```text
CISTRS/backend
```

Run:

```bash
npx prisma db pull
```

If the connection is successful, Prisma should display something similar to:

```text
Datasource "db": PostgreSQL database "cistrs", schema "public" at "localhost:5432"
```

### If you see P4001

You may see:

```text
P4001 The introspected database was empty
```

This does **not** mean the connection failed.

It means:

> Prisma successfully connected to your `cistrs` database, but the database does not have any tables yet.

This is normal for a newly created database.

---

# 7. Apply the CISTRS Database Structure

Once the project's Prisma migrations are available, run:

```bash
npx prisma migrate dev
```

This will create the required CISTRS tables in your local `cistrs` database.

You should **not** manually create those tables in pgAdmin.

The migration files in the repository are what keep everyone's database structure consistent.

---

# 8. Generate Prisma Client

Run:

```bash
npx prisma generate
```

This generates the Prisma Client used by the CISTRS backend.

---

# 9. Verify the Database with Prisma Studio

Run:

```bash
npx prisma studio
```

Prisma will provide a local URL in the terminal.

Open that URL in your browser.

You should be able to see the CISTRS database models/tables managed by Prisma.

---

# 10. Start the Backend Server

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

# 11. Test the Backend

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

---

# 12. Setup Checklist

Before considering the setup complete, make sure:

- [ ] PostgreSQL installed
- [ ] PostgreSQL 18 server running
- [ ] PostgreSQL username is `postgres`
- [ ] PostgreSQL password is `password`
- [ ] PostgreSQL port is `5432`
- [ ] pgAdmin 4 opens successfully
- [ ] `cistrs` database created
- [ ] `.env` created inside `backend`
- [ ] `DATABASE_URL` configured correctly
- [ ] `npx prisma db pull` successfully connects to PostgreSQL
- [ ] Prisma migrations applied
- [ ] Prisma Client generated
- [ ] Prisma Studio can open
- [ ] Backend starts with `npm run dev`
- [ ] `/api/health` responds successfully

If all of these are complete, your laptop is ready for CISTRS backend development.

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

Prisma migrations are used to keep their database structures synchronized with the project.

```text
GitHub Repository
       │
       ├── Prisma Schema
       │
       └── Prisma Migrations
              │
       ┌──────┼──────┐
       ↓      ↓      ↓
    Local   Local   Local
     DB      DB      DB
```

**Do not commit your `.env` file or your local PostgreSQL database.**

Only the Prisma schema and migration files should be shared through the repository.
