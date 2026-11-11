# CISTRS API Reference and Services Documentation

endpoints, request bodies, response shapes, validation rules and error behaviour.

- **Base URL (local):** `http://localhost:5000/api`
- **Format:** JSON in, JSON out (one endpoint returns CSV, see [Logbook export](#post-apilogbookexport))
- **Stack:** Express 5, Prisma 7, PostgreSQL, Zod validation


### Quick endpoint index

| Module | Endpoints |
| --- | --- |
| Auth | `POST /auth/login` <br> `GET /auth/me` <br> `POST /auth/logout` |
| Users | `GET /users` <br> `POST /users` |
| Aircraft | `GET /aircraft/statuses` <br> `GET /aircraft` <br> `GET·POST·PATCH /aircraft/:id/status` |
| Personnel | `GET·POST /personnel/employees` <br> `GET·PATCH /personnel/employees/:id` <br> `GET /personnel/licenses/expiring` |
| Inventory | `GET·POST /inventory/parts` <br> `GET·PATCH /inventory/parts/:id` <br> `GET /inventory/parts/:id/stock` <br> `PUT /inventory/parts/:id/stock/:locationId` <br> `GET·POST /inventory/parts/:id/aircraft` <br> `POST /inventory/parts/:id/aircraft/:aircraftId/return` <br> `GET /inventory/aircraft/:id/parts` <br> `GET /inventory/transactions` <br> `GET /inventory/transactions/:id` <br> `GET /inventory/parts/:id/history` |
| Maintenance | `GET·POST /maintenance/ad-records` <br> `GET·PATCH /maintenance/ad-records/:id` <br> `GET·POST /maintenance/cpcp-tasks` <br> `GET·PATCH /maintenance/cpcp-tasks/:id` <br> `GET /maintenance/aircraft/:id` |
| Logbook | `GET·POST /logbook/sectors` <br> `GET·PATCH /logbook/sectors/:id` <br> `POST /logbook/sectors/:id/fuel-transactions` <br> `GET·PATCH /logbook/fuel-transactions/:id` <br> `POST /logbook/export` |

## Contents

1. [Conventions](#1-conventions)
2. [Access control](#2-access-control)
3. [Auth](#3-auth)
4. [Users](#4-users)
5. [Aircraft](#5-aircraft)
6. [Personnel](#6-personnel)
7. [Inventory](#7-inventory)
8. [Maintenance](#8-maintenance)
9. [Logbook](#9-logbook)
10. [Reference data and known gaps](#10-reference-data-and-known-gaps)
11. [Frontend snippets](#11-frontend-snippets)

---

## 1. Conventions

### Requests

| Topic | Rule |
| --- | --- |
| Auth header | `Authorization: Bearer <token>` on every endpoint except `GET /api/health` and `POST /api/auth/login`. |
| Body | Always send `Content-Type: application/json` on POST / PUT / PATCH. |
| IDs | All IDs are UUID strings. A malformed ID in the URL returns `400` (for example `Invalid part ID`), not `500`. |
| Dates | `"YYYY-MM-DD"` (impossible dates like `2026-02-30` are rejected). |
| Timestamps (input) | ISO 8601 **with a time zone**: `2026-10-15T01:00:00Z` or `2026-10-15T09:00:00+08:00`. A timestamp without a zone is rejected. |
| Timestamps (output) | ISO strings in UTC (`...Z`). |
| Decimals | Sent and received as plain JSON numbers, at most 2 decimal places, never negative. |
| Strict bodies | Most create/update bodies reject unknown fields with `400`. Send only the documented fields. |
| Text fields | Trimmed, then must be non-empty. **Do not send `""` for an optional text field.** Omit it, or send `null` where `null` is allowed. |

### PATCH semantics

- Send **only the fields you want to change**. Unsent fields are never touched.
- Sending `null` **clears** a field, but only where the docs say the field is nullable. Required fields cannot be cleared.
- An empty body (`{}`) returns `400` (`Provide at least one field to update`).
- You cannot change the parent of a record (for example the aircraft of an AD record). Sending it returns `400`.
- There are **no DELETE endpoints** anywhere in the API.

### Pagination and `X-Total-Count`

List endpoints that page accept `limit` and `offset` and return the total match count in the **`X-Total-Count`** response header (the body is a plain array). The header is exposed to browser code through CORS.

| Endpoint family | `limit` default | `limit` max | Notes |
| --- | --- | --- | --- |
| Inventory history, maintenance lists, logbook sectors | 50 | 200 | `offset` default 0 |
| `GET /personnel/employees` | none (returns **all** matches) | 200 | Send `limit` to page |
| Other lists (`/aircraft`, `/inventory/parts`, `/users`, ...) | not paged | n/a | No `X-Total-Count` |

### Errors

Every error is JSON:

```json
{ "message": "Validation failed", "details": [ { "field": "date_hired", "message": "Date hired cannot be before the date of birth" } ] }
```

`details` is present only for validation errors (array of `{ field, message }`) and a few special cases noted per endpoint. `field` uses dot paths (`initial_stock.quantity`).

| Status | Meaning |
| --- | --- |
| `400` | Validation failed, invalid UUID in the URL, or a business rule was broken. |
| `401` | Missing, invalid, expired or revoked token; account inactive. Send the user to the login screen. |
| `403` | Authenticated but not allowed: missing feature, inactive employee/position, or no features assigned. |
| `404` | Record not found (including a referenced record, like an unknown `aircraft_UUID` in a body). Unknown `/api/*` paths return `{ "message": "Route not found" }`. |
| `405` | Inventory history is read-only (only GET / HEAD). |
| `409` | Duplicate (employee number, username, part number, name + birth date) or a stock conflict. |
| `500` | Unexpected server error: `{ "message": "Internal server error" }`. Also returned for **malformed JSON bodies** (see [gaps](#10-reference-data-and-known-gaps)). |

Known `401` / `403` messages (useful for logout vs. show-message logic):

| Status | `message` |
| --- | --- |
| 401 | `Authentication required` (no Bearer header) |
| 401 | `Invalid or expired token` |
| 401 | `Session ended. Please log in again.` (token was logged out) |
| 401 | `Account is not active` |
| 403 | `Employee record is inactive` |
| 403 | `Assigned position is inactive` |
| 403 | `No system features are assigned to this position` |
| 403 | `You do not have permission to do this` (module feature missing) |

### CORS

Open to all origins. `X-Total-Count` and `Content-Disposition` are exposed to JavaScript.

### Health check

`GET /api/health` (public) returns `{ "status": "ok", "message": "CISTRS backend is running!" }`. It proves the server is up, not that the database connects.

---

## 2. Access control

Access is **position-based**. Every employee has one position; a position grants a set of **features**. Each module is mounted behind one feature, and the user's `features` array comes back from login and `GET /api/auth/me`.

| Module (URL prefix) | Required feature |
| --- | --- |
| `/api/users` | `User Accounts` |
| `/api/inventory` | `Inventory` |
| `/api/aircraft` | `Aircraft` |
| `/api/logbook` | `Logbook` |
| `/api/maintenance` | `Maintenance` |
| `/api/personnel` | `Personnel` |
| `/api/auth/*` | any valid token (no feature) |

Feature names (exact strings): `Dashboard`, `Inventory`, `Aircraft`, `Maintenance`, `Logbook`, `Personnel`, `Availability`, `Notifications`, `User Accounts`.

`Dashboard`, `Availability` and `Notifications` exist as features but **have no backend endpoints yet**.

Use `features` to show or hide navigation. The server re-checks the account, position and features on **every request**, so a deactivated user or changed position takes effect immediately (the next call returns 401/403).

**Seeded positions to features (dev database only, may change):**

| Position | Features |
| --- | --- |
| President / CEO | all nine |
| Accountable Manager | Aircraft, Availability, Dashboard, Notifications |
| Chief Aircraft Mechanic | Dashboard, Inventory, Maintenance, Notifications |
| First Officer | Availability, Dashboard, Logbook, Notifications |
| Captain | Availability, Dashboard, Logbook, Notifications |
| Quality Manager | Dashboard, Notifications, Personnel |
| Inventory Officer | Dashboard, Inventory, Notifications |
| Assistant Safety Manager | Dashboard, Notifications |

Seeded usernames: `adrian.reyes`, `marissa.santos`, `ramon.villanueva`, `angela.cruz`, `patricia.flores`, `joshua.garcia`, `nicole.bautista`, and `daniel.mendoza` (**Inactive**, use it to test the rejected-login path). All share the password from `SEED_DEFAULT_PASSWORD` in the backend `.env`.

---

## 3. Auth

### POST `/api/auth/login`

Public.

```json
{ "username": "adrian.reyes", "password": "••••••••" }
```

`200`:

```json
{
  "token": "<jwt>",
  "user": {
    "account_UUID": "…",
    "emp_UUID": "…",
    "username": "adrian.reyes",
    "position": { "position_UUID": "…", "position_name": "President / CEO" },
    "features": ["Dashboard", "Inventory", "Aircraft"]
  }
}
```

- The username is trimmed and lower-cased by the server. The password is sent as typed.
- The token lasts **8 hours** by default (server setting). There is **no refresh endpoint**; on expiry the API returns 401 and the user must log in again.

| Status | `message` |
| --- | --- |
| 400 | `Validation failed` (empty username/password) |
| 401 | `Invalid username or password` (same message for unknown user and wrong password) |
| 403 | `This account is not active. Contact an administrator.` |
| 403 | `Your assigned position is inactive. Contact an administrator.` |
| 403 | `No system features are assigned to your position. Contact an administrator.` |

### GET `/api/auth/me`

Returns the same `user` object as login (`account_UUID`, `emp_UUID`, `username`, `position`, `features`). Call it on app start to restore a session from a stored token.

### POST `/api/auth/logout`

No body. `200 { "message": "Logged out successfully" }`. The token is revoked server-side. Revocation is held in memory, so it resets if the server restarts. Always also delete the token on the client.

---

## 4. Users

Requires feature `User Accounts`.

### GET `/api/users`

All accounts ordered by username. Passwords are never returned.

```json
[
  {
    "account_UUID": "…",
    "username": "adrian.reyes",
    "account_status": "Active",
    "last_login_at": "2026-11-11T02:15:00.000Z",
    "employee": {
      "emp_UUID": "…", "emp_number": "SA-0001", "f_name": "Adrian", "l_name": "Reyes",
      "position": { "position_UUID": "…", "position_name": "President / CEO" }
    }
  }
]
```

`account_status` is `"Active" | "Inactive" | "Locked"`. `last_login_at` is `null` if the user never logged in.

### POST `/api/users`

Creates a login for an **existing** employee. The employee's position decides their access.

```json
{ "emp_UUID": "…", "username": "juan.delacruz", "password": "Passw0rd123" }
```

| Field | Rule |
| --- | --- |
| `emp_UUID` | valid UUID of an existing employee |
| `username` | 3 to 50 chars, letters / numbers / `.` `_` `-` only (lower-cased by the server) |
| `password` | 8 to 72 chars, at least one letter and one number |

`201`:

```json
{
  "account_UUID": "…", "emp_UUID": "…", "username": "juan.delacruz",
  "account_status": "Active", "created_at": "2026-11-11T05:00:00.000Z",
  "employee": { "emp_number": "SA-0009", "position": { "position_UUID": "…", "position_name": "Captain" } }
}
```

Errors: `404 Employee not found`; `400 Cannot create an account for an inactive employee` / `…with an inactive position`; `409 This employee already has a user account`; `409 Username is already taken`.

> There are no endpoints yet to deactivate an account, reset a password, or list positions.

---

## 5. Aircraft

Requires feature `Aircraft`. "Status information" is the aircraft's status plus its current flight hours.

**Aircraft status object** (returned by all endpoints below):

```json
{
  "aircraft_UUID": "…",
  "registration": "RP-C1234",
  "aircraft_type": { "aircraft_type_UUID": "…", "type_name": "Cessna 208B Grand Caravan" },
  "status": { "aircraft_status_UUID": "…", "status_name": "Airworthy", "description": "…" },
  "current_hours": 1234.5,
  "hours_updated_at": "2026-11-10T08:00:00.000Z"
}
```

| Method and path | Purpose | Success |
| --- | --- | --- |
| `GET /api/aircraft/statuses` | Allowed statuses for a dropdown: `[{ aircraft_status_UUID, status_name, description }]` (seeded: Airworthy, In Maintenance, AOG) | 200 |
| `GET /api/aircraft` | Every aircraft with status and hours, ordered by registration | 200 |
| `GET /api/aircraft/:aircraft_UUID/status` | One aircraft | 200 |
| `POST /api/aircraft/:aircraft_UUID/status` | Record status (and optionally hours) | **201** |
| `PATCH /api/aircraft/:aircraft_UUID/status` | Change status and/or hours | 200 |

**POST body** (`aircraft_status_UUID` required):

```json
{ "aircraft_status_UUID": "…", "current_hours": 1250.75 }
```

**PATCH body:** any subset of the same two fields, at least one.

- `current_hours`: number from 0 to 99,999,999.99, at most 2 decimals.
- `hours_updated_at` refreshes only when `current_hours` is sent.
- Both POST and PATCH return the full aircraft status object.
- Errors: `404 Aircraft not found`, `404 Aircraft status not found`, `400` validation.

> There is no endpoint to create an aircraft or list aircraft types.

---

## 6. Personnel

Requires feature `Personnel`. **Pilots are employees** whose `personnel_category` is `"Pilot"`; there is no separate pilot endpoint. Use `personnel_category_UUID` (or the category name in the response) to tell them apart.

### Employee object

Returned by list, single, create and update:

```json
{
  "emp_UUID": "…",
  "emp_number": "SA-0001",
  "f_name": "Adrian", "m_name": null, "l_name": "Reyes", "suffix": null,
  "date_of_birth": "1980-05-14",
  "sex": "Male",
  "blood_type": "O+",
  "photo": null,
  "date_hired": "2015-03-01",
  "department": "Executive",
  "record_status": "Active",
  "supervisor_emp_UUID": null,
  "base_UUID": "…", "emp_status_UUID": "…", "position_UUID": "…", "personnel_category_UUID": "…",
  "created_at": "…", "updated_at": "…", "created_by": "…", "updated_by": "…",

  "personnel_category": "Pilot",
  "base": { "base_UUID": "…", "base_name": "Cebu", "base_location": "…", "base_status": "Active" },
  "employment_status": { "emp_status_UUID": "…", "status_name": "Regular", "description": "…" },
  "position": { "position_UUID": "…", "position_name": "Captain" },
  "supervisor": { "emp_UUID": "…", "emp_number": "SA-0002", "f_name": "…", "l_name": "…" },
  "contacts": [
    { "employee_UUID": "…", "contact_UUID": "…", "contact": { "contact_UUID": "…", "contact_type": "Email", "contact_value": "a@b.com" } }
  ],
  "licenses": [
    {
      "emp_license_UUID": "…", "emp_UUID": "…", "license_type_UUID": "…", "renewal_status_UUID": "…",
      "license_number": "…", "issuing_authority": "…",
      "date_issued": "2020-01-01T00:00:00.000Z", "expiry_date": "2027-01-01T00:00:00.000Z",
      "remarks": null, "created_at": "…", "updated_at": "…",
      "license_type": { "license_type_UUID": "…", "license_type_name": "Commercial Pilot License", "description": "…" }
    }
  ]
}
```

Things to watch:

- `personnel_category` is the **category name (string)**; the ID is `personnel_category_UUID`.
- `date_of_birth` and `date_hired` are `"YYYY-MM-DD"`. The dates **inside `licenses`** are full ISO timestamps (`…T00:00:00.000Z`); take the first 10 characters if you want a plain date.
- `supervisor` is `null` when there is none. `contact_type` is `"Email" | "Phone"`.
- Contacts and licenses are **read-only here**; there are no endpoints to add or edit them.
- A license's renewal status (`renewal_status_UUID`) is an ID only; its name is not included.

### POST `/api/personnel/employees` (create)

`201` with the employee object.

| Field | Required | Rule |
| --- | --- | --- |
| `emp_number` | yes | Matches `SA-` plus 4 or more digits (`SA-0042`), max 20. Stored upper-case. Unique, case-insensitive. |
| `f_name`, `l_name` | yes | Text, max 100 |
| `m_name` | no | Text max 100, or `null` |
| `suffix` | no | Text max 20, or `null` |
| `date_of_birth` | yes | `YYYY-MM-DD`, not in the future |
| `sex` | yes | `"Male"` or `"Female"` |
| `blood_type` | no | One of `A+ A- B+ B- AB+ AB- O+ O-`, or `null` |
| `photo` | no | Text max 500 (a URL or path; there is **no upload endpoint**), or `null` |
| `date_hired` | yes | `YYYY-MM-DD`, not before `date_of_birth` |
| `department` | yes | Text max 100 |
| `record_status` | no | `"Active"` (default) or `"Inactive"` |
| `supervisor_emp_UUID` | no | UUID of an **active** employee, or `null` |
| `base_UUID` | yes | Must exist and be **Active** |
| `emp_status_UUID` | yes | Must exist |
| `position_UUID` | yes | Must exist and be **active** |
| `personnel_category_UUID` | yes | Must exist |

Errors: `400` validation; `404 Base not found` / `Employment status not found` / `Position not found` / `Personnel category not found` / `Supervisor not found`; `400 Base is not active` / `Position is not active` / `Supervisor is not an active employee`; `409 Employee number already exists`; `409 An employee with the same name and date of birth already exists` (this one carries `details: { emp_UUID, emp_number }` of the existing record).

### GET `/api/personnel/employees` (list)

Ordered by `emp_number`. Query parameters, all optional:

| Param | Meaning |
| --- | --- |
| `record_status` | `Active` or `Inactive` |
| `personnel_category_UUID` | filter by category (use it for a "Pilots" view) |
| `base_UUID` | filter by base |
| `q` | Case-insensitive search on employee number and first / middle / last name, max 100 chars. Several words must each match something (`adrian reyes`). |
| `limit` | 1 to 200. **Omitted = every match is returned.** |
| `offset` | default 0 |

Returns an array of employee objects and the **`X-Total-Count`** header (total matches, ignoring paging).

### GET `/api/personnel/employees/:emp_UUID`

One employee, or `404 Employee not found`.

### PATCH `/api/personnel/employees/:emp_UUID` (update)

Any subset of the create fields. `null` clears `m_name`, `suffix`, `blood_type`, `photo` and `supervisor_emp_UUID`. Returns the full employee object.

- If nothing actually differs from the stored values, the record (and its audit columns) is left untouched and the current record is returned with `200`.
- Extra rules: you **cannot set `record_status` to `Inactive` on your own record** (`400 You cannot deactivate your own record`); an employee cannot be their own supervisor, and a supervisor choice that creates a reporting loop is rejected (`400`). Reference checks (base, position, ...) run only for fields you change.

### GET `/api/personnel/licenses/expiring?days=60`

Licenses expiring within `days` days from now (default 60; invalid or below 1 falls back to 60). Sorted by `expiry_date` ascending. **Already-expired licenses are included** (there is no lower bound). Not paged.

```json
[
  {
    "emp_license_UUID": "…", "emp_UUID": "…", "license_type_UUID": "…", "renewal_status_UUID": "…",
    "license_number": "…", "issuing_authority": "…",
    "date_issued": "2020-01-01T00:00:00.000Z", "expiry_date": "2026-12-01T00:00:00.000Z", "remarks": null,
    "license_type": { "license_type_UUID": "…", "license_type_name": "…", "description": "…" },
    "employee": { "emp_number": "SA-0004", "f_name": "Angela", "l_name": "Cruz" }
  }
]
```

---

## 7. Inventory

Requires feature `Inventory`.

How it works: quantity lives per **part + location**. Every change is written to an append-only ledger (the "history"). Availability is **derived** from quantity, so it can never disagree with it.

| Level | Values |
| --- | --- |
| Part `availability` | `"In Stock"`, `"Low Stock"` (total below `min_stock_level`), `"Out of Stock"` (total is 0) |
| Location `availability` | `"Available"`, `"Out of Stock"` |

### Part object

```json
{
  "part_UUID": "…", "part_number": "PN-1001", "part_name": "Oil Filter",
  "unit_of_measure": "pcs", "min_stock_level": 5, "description": null,
  "total_quantity": 12,
  "is_low_stock": false,
  "availability": "In Stock",
  "locations": [
    { "status_UUID": "…", "location_UUID": "…", "location_name": "Cebu Main Store", "storage_area": "Shelf A1",
      "current_quantity": 12, "availability": "Available" }
  ],
  "suppliers": ["Acme Aero Supply"],
  "manufacturers": ["Lycoming"]
}
```

`suppliers` and `manufacturers` are arrays of organisation **names** (strings, not objects). `is_low_stock` is `total_quantity < min_stock_level`.

### Parts endpoints

| Method and path | Purpose | Success |
| --- | --- | --- |
| `POST /api/inventory/parts` | Create a part, optionally with starting stock | 201 |
| `GET /api/inventory/parts?search=` | All parts (not paged), ordered by part number. `search` is a case-insensitive match on number or name (max 100). | 200 |
| `GET /api/inventory/parts/:part_UUID` | One part | 200 |
| `PATCH /api/inventory/parts/:part_UUID` | Update part details | 200 |
| `GET /api/inventory/parts/:part_UUID/stock` | Stock view (total and per location) | 200 |
| `PUT /api/inventory/parts/:part_UUID/stock/:location_UUID` | Set quantity at a location | 200 |

**Create body:**

```json
{
  "part_number": "PN-1001", "part_name": "Oil Filter", "unit_of_measure": "pcs",
  "min_stock_level": 5, "description": "optional",
  "initial_stock": { "location_UUID": "…", "quantity": 10 }
}
```

| Field | Rule |
| --- | --- |
| `part_number` | required, max 50, unique (`409 Part number already exists`) |
| `part_name` | required, max 150 |
| `unit_of_measure` | required, max 20 |
| `min_stock_level` | optional whole number ≥ 0, default 0 |
| `description` | optional, max 500 |
| `initial_stock` | optional; `quantity` is a whole number ≥ 1; the location must exist (`404 Location not found`). Creates the stock row plus a `RECEIPT` history entry. |

**PATCH body:** any subset of `part_number`, `part_name`, `unit_of_measure`, `min_stock_level`, `description` (`null` clears it). Unknown fields return `400`. Returns the full part object. Stock is **not** changed here, use the stock endpoint.

**Stock view** (`GET .../stock` and the response of `PUT`):

```json
{
  "part_UUID": "…", "part_number": "…", "part_name": "…", "unit_of_measure": "pcs",
  "min_stock_level": 5, "total_quantity": 12, "availability": "In Stock", "is_low_stock": false,
  "locations": [ { "status_UUID": "…", "location_UUID": "…", "location_name": "…", "storage_area": "…", "current_quantity": 12, "availability": "Available" } ]
}
```

**PUT stock body:** `{ "quantity": 8, "remarks": "Cycle count" }`

- `quantity` is the **new absolute quantity** (whole number ≥ 0), not a delta. A stock row is created if the part was never stored at that location.
- `remarks` is optional, max 500, and **cannot start with `[aircraft:`** (reserved).
- A change is recorded as an `ADJUSTMENT` history entry. If the quantity is unchanged, nothing is recorded.
- `409 Stock was changed by someone else. Please retry.` if another request changed that row at the same moment. Refetch and retry.

### Aircraft and parts

A part is "on" an aircraft after an issue and stops being on it after a return.

| Method and path | Purpose | Success |
| --- | --- | --- |
| `POST /api/inventory/parts/:part_UUID/aircraft` | Assign stock to an aircraft | 201 |
| `POST /api/inventory/parts/:part_UUID/aircraft/:aircraft_UUID/return` | Return stock from an aircraft | 200 |
| `GET /api/inventory/parts/:part_UUID/aircraft` | Aircraft this part is on | 200 |
| `GET /api/inventory/aircraft/:aircraft_UUID/parts` | Parts on an aircraft | 200 |

**Assign body:** `{ "aircraft_UUID": "…", "location_UUID": "…", "quantity": 2, "remarks": "optional" }` (`quantity` whole number ≥ 1).
Takes stock out of that location (history type `ISSUE`).
Errors: `404` part / aircraft not found; `404 This part has no stock at that location`; `400 Insufficient stock at that location`.

**Return body:** `{ "location_UUID": "…", "quantity": 1, "remarks": "optional" }`. Puts stock back (history type `RETURN`); the stock row is created if needed.
Errors: `404 Location not found`; `400 Only N of this part is/are assigned to this aircraft`.

Both return:

```json
{ "part_UUID": "…", "aircraft_UUID": "…", "registration": "RP-C1234", "quantity_on_aircraft": 2 }
```

**`GET /parts/:part_UUID/aircraft`:**

```json
{ "part_UUID": "…", "part_number": "…", "part_name": "…",
  "aircraft": [ { "aircraft_UUID": "…", "registration": "RP-C1234", "quantity_on_aircraft": 2 } ] }
```

**`GET /aircraft/:aircraft_UUID/parts`:**

```json
{ "aircraft_UUID": "…", "registration": "RP-C1234",
  "parts": [ { "part_UUID": "…", "part_number": "…", "part_name": "…", "unit_of_measure": "pcs", "quantity_on_aircraft": 2 } ] }
```

Only entries with a quantity above 0 are listed. Parts never assigned to an aircraft simply do not appear.

### History (read-only)

| Method and path | Purpose |
| --- | --- |
| `GET /api/inventory/transactions` | Filterable, paged history (newest first) |
| `GET /api/inventory/transactions/:transaction_UUID` | One record |
| `GET /api/inventory/parts/:part_UUID/history` | One part's history (same query options) |

Any non-GET/HEAD method on these paths returns `405` (`History records are read-only and cannot be modified`).

Query parameters (all optional): `part_UUID`, `status_UUID`, `location_UUID`, `aircraft_UUID`, `transaction_type` (`RECEIPT | ISSUE | ADJUSTMENT | RETURN | TRANSFER`), `from`, `to`, `limit` (default 50, max 200), `offset`. The total is in `X-Total-Count`.

`from` / `to` accept a date or a timestamp. A bare date means **00:00 UTC of that day**, so to include all of an end day send a timestamp such as `2026-11-10T23:59:59Z` for `to`.

Record:

```json
{
  "transaction_UUID": "…", "status_UUID": "…",
  "transaction_type": "ISSUE",
  "quantity_change": -2,
  "created_at": "2026-11-10T08:00:00.000Z",
  "remarks": "Installed on left engine",
  "aircraft": { "aircraft_UUID": "…", "registration": "RP-C1234" },
  "status": {
    "status_UUID": "…",
    "part": { "part_UUID": "…", "part_number": "…", "part_name": "…", "unit_of_measure": "pcs" },
    "location": { "location_UUID": "…", "location_name": "…", "storage_area": "…" }
  },
  "updater": { "emp_UUID": "…", "emp_number": "SA-0006", "f_name": "Joshua", "l_name": "Garcia" }
}
```

`quantity_change` is signed (negative for issues). `aircraft` is `null` unless the entry came from an assign / return. `remarks` is already cleaned of the internal aircraft tag.

---
## 8. Maintenance

Requires feature `Maintenance`. Two record types, each tied to **one aircraft** and **one employee**:

- **AD records**: Airworthiness Directive compliance, signed off by a mechanic.
- **CPCP tasks**: Corrosion Prevention and Control Program tasks, assigned to an employee.

Maintenance responses report whether a record is **overdue**; they never change the aircraft's status.

**Aircraft summary** used in these responses (note `status` is a **string** here, unlike the aircraft module where it is an object):

```json
{ "aircraft_UUID": "…", "registration": "RP-C1234", "status": "Airworthy", "current_hours": 1234.5 }
```

**Employee summary** used across maintenance and logbook: `{ "emp_UUID": "…", "emp_number": "SA-0003", "f_name": "Ramon", "l_name": "Villanueva" }`.

**Due information** added to every AD record and CPCP task:

| Field | Meaning |
| --- | --- |
| `due_status` | `"Overdue"`, `"Current"` or `"Not Scheduled"` (no due date and no due hours) |
| `overdue` | `true` if the due date has passed **or** the aircraft's current hours exceed the due hours (due exactly today / at exactly the due hours is *not* overdue) |
| `days_until_due` | whole days; negative when past; `null` if no due date |
| `hours_until_due` | hours; negative when past; `null` if no due hours |

### AD records

| Method and path | Purpose | Success |
| --- | --- | --- |
| `POST /api/maintenance/ad-records` | Create | 201 |
| `GET /api/maintenance/ad-records?aircraft_UUID=&limit=&offset=` | List, newest `effective_date` first, `X-Total-Count` | 200 |
| `GET /api/maintenance/ad-records/:ad_UUID` | One record | 200 |
| `PATCH /api/maintenance/ad-records/:ad_UUID` | Update | 200 |

**AD record object:**

```json
{
  "ad_UUID": "…",
  "aircraft": { "aircraft_UUID": "…", "registration": "RP-C1234", "status": "Airworthy", "current_hours": 1234.5 },
  "mechanic": { "emp_UUID": "…", "emp_number": "SA-0003", "f_name": "Ramon", "l_name": "Villanueva" },
  "faa_ad_number": "2024-05-12",
  "amendment_number": null,
  "subject": "Propeller blade inspection",
  "ad_category": "Recurring",
  "effective_date": "2024-03-01",
  "compliance_method": "Visual inspection per AD",
  "frequency": "Every 100 hours",
  "date_of_compliance": "2026-09-01",
  "next_due_date": "2026-12-01",
  "next_due_hours": 1300,
  "mechanic_license_number": "AMT-12345",
  "remarks": null,
  "pdf_link": "https://example.com/ad.pdf",
  "due_status": "Current", "overdue": false, "days_until_due": 20, "hours_until_due": 65.5
}
```

**Create body.** Required: `aircraft_UUID`, `mechanic_emp_UUID`, `faa_ad_number` (≤50), `subject` (≤300), `ad_category` (≤100), `effective_date`, `compliance_method` (≤1000), `mechanic_license_number` (≤50). Optional (can also be `null`): `amendment_number` (≤50), `frequency` (≤100), `date_of_compliance`, `next_due_date`, `next_due_hours` (0 to 99,999,999.99), `remarks` (≤1000), `pdf_link` (http/https URL, ≤500).

Rules (the server returns `400 Validation failed` with `details`):
- `date_of_compliance` cannot be in the future or before `effective_date`.
- If both are given, `next_due_date` must be **after** `date_of_compliance`.
- The mechanic must be an existing **active** employee (`404 Mechanic not found`, `400 Mechanic is not an active employee`). Unknown aircraft: `404 Aircraft not found`.

**PATCH body:** any subset of the fields above **except `aircraft_UUID`** (cannot be changed). `null` clears the optional fields. The cross-field date rules are checked against the final combined values.

### CPCP tasks

| Method and path | Purpose | Success |
| --- | --- | --- |
| `POST /api/maintenance/cpcp-tasks` | Create | 201 |
| `GET /api/maintenance/cpcp-tasks?aircraft_UUID=&limit=&offset=` | List, earliest `due_date` first (no due date last), `X-Total-Count` | 200 |
| `GET /api/maintenance/cpcp-tasks/:cpcp_UUID` | One task | 200 |
| `PATCH /api/maintenance/cpcp-tasks/:cpcp_UUID` | Update | 200 |

**CPCP task object:**

```json
{
  "cpcp_UUID": "…",
  "aircraft": { "aircraft_UUID": "…", "registration": "RP-C1234", "status": "Airworthy", "current_hours": 1234.5 },
  "assignee": { "emp_UUID": "…", "emp_number": "SA-0003", "f_name": "Ramon", "l_name": "Villanueva" },
  "task_reference": "CPCP-57-10",
  "description": null,
  "due_hours": 1400, "due_date": "2027-01-15",
  "last_accomplished_date": "2026-07-01",
  "last_updated": "2026-11-01T03:00:00.000Z",
  "remarks": null,
  "due_status": "Current", "overdue": false, "days_until_due": 65, "hours_until_due": 165.5
}
```

**Create body.** Required: `aircraft_UUID`, `assigned_to` (employee UUID), `task_reference` (≤100). Optional (or `null`): `description` (≤1000), `due_hours`, `due_date`, `last_accomplished_date`, `remarks` (≤1000).

Rules: `last_accomplished_date` cannot be in the future; if both are given, `due_date` must be **after** `last_accomplished_date`; the assignee must be an active employee (`404 Assignee not found`, `400 Assignee is not an active employee`).

**PATCH body:** any subset except `aircraft_UUID`; `null` clears optional fields.

> **Request vs response names:** requests use `mechanic_emp_UUID` / `assigned_to` (a UUID); responses return `mechanic` / `assignee` (an employee summary object).

### GET `/api/maintenance/aircraft/:aircraft_UUID`

One call that answers "can this aircraft be used?". **Not paged**: returns every record.

```json
{
  "aircraft": { "aircraft_UUID": "…", "registration": "…", "status": "…", "current_hours": 1234.5 },
  "overdue_count": 1,
  "ad_records": [ /* AD record objects */ ],
  "cpcp_tasks": [ /* CPCP task objects */ ]
}
```

---

## 9. Logbook

Requires feature `Logbook`. A **logbook entry is a flight sector plus the fuel transactions linked to it**. The server fills `entered_by` (the logged-in employee) and, for fuel rows, the aircraft and `recorded_by`; the client never sends them. Entries stay editable.

### Sector object

Returned by create, list, single and update:

```json
{
  "sector_UUID": "…",
  "aircraft": { "aircraft_UUID": "…", "registration": "RP-C1234", "status": "Airworthy", "current_hours": 1234.5 },
  "flight_date": "2026-11-10",
  "route": "CEB-MNL",
  "flight_status": { "flight_status_UUID": "…", "status_name": "Completed" },
  "flight_type": { "flight_type_UUID": "…", "type_name": "Charter" },
  "day_night": "Day",
  "pic": { "emp_UUID": "…", "emp_number": "SA-0007", "f_name": "Nicole", "l_name": "Bautista" },
  "sic": null,
  "observer": null,
  "std": "2026-11-10T00:00:00.000Z", "sta": "2026-11-10T01:30:00.000Z",
  "off_block": null, "airborne": null, "touchdown": null, "on_block": null,
  "flight_time": 1.5,
  "pax_count": 8,
  "fuel_departure": 120, "fuel_arrival": 80, "fuel_used": 40, "fuel_unit": "gal",
  "delay_category": { "delay_category_UUID": "…", "category_name": "Weather" },
  "delay_cause": "Thunderstorm at origin",
  "qa_check_status": null,
  "entered_by": { "emp_UUID": "…", "emp_number": "SA-0004", "f_name": "Angela", "l_name": "Cruz" },
  "fuel_transactions": [
    {
      "fuel_transaction_UUID": "…", "sector_UUID": "…", "aircraft_UUID": "…",
      "transaction_date": "2026-11-10", "transaction_type": "Refuel", "quantity_gal": 40,
      "issued_to": { "emp_UUID": "…", "emp_number": "…", "f_name": "…", "l_name": "…" },
      "recorded_by": { "emp_UUID": "…", "emp_number": "…", "f_name": "…", "l_name": "…" },
      "remarks": null
    }
  ]
}
```

`sic`, `observer`, `delay_category`, times, fuel and text fields are `null` when not recorded. `fuel_transactions` is ordered by date.

> **Request vs response names:** requests send `pic_emp_UUID`, `sic_emp_UUID`, `observer_emp_UUID`, `flight_status_UUID`, `flight_type_UUID`, `delay_category_UUID` and `issued_to` as **UUID strings**; responses return `pic`, `sic`, `observer`, `flight_status`, `flight_type`, `delay_category` and `issued_to` as **objects**.

### Endpoints

| Method and path | Purpose | Success |
| --- | --- | --- |
| `POST /api/logbook/sectors` | Create an entry (optionally with fuel rows) | 201 |
| `GET /api/logbook/sectors` | List entries | 200 |
| `GET /api/logbook/sectors/:sector_UUID` | One entry | 200 |
| `PATCH /api/logbook/sectors/:sector_UUID` | Update an entry | 200 |
| `POST /api/logbook/sectors/:sector_UUID/fuel-transactions` | Add a fuel row to an entry | 201 |
| `GET /api/logbook/fuel-transactions/:fuel_UUID` | One fuel row | 200 |
| `PATCH /api/logbook/fuel-transactions/:fuel_UUID` | Update a fuel row | 200 |
| `POST /api/logbook/export` | Download a CSV | 200 |

### POST `/api/logbook/sectors`

**Required:** `aircraft_UUID`, `flight_status_UUID`, `flight_type_UUID`, `pic_emp_UUID`, `flight_date` (`YYYY-MM-DD`), `route` (≤100).

**Optional** (can be `null` unless noted): `sic_emp_UUID`, `observer_emp_UUID`, `delay_category_UUID`, `delay_cause` (≤500), `std`, `sta`, `off_block`, `airborne`, `touchdown`, `on_block` (timestamps **with time zone**), `flight_time` (0 to 9999.99), `day_night` (`"Day"` or `"Night"`), `pax_count` (whole number 0 to 999, **cannot be null**, defaults to 0), `fuel_departure`, `fuel_arrival`, `fuel_used`, `fuel_unit` (≤20), `qa_check_status` (≤50), and `fuel_transactions` (array of up to 20 fuel inputs, see below).

Everything is validated before anything is saved, so a bad nested fuel row means nothing is created.

**Rules** (`400 Validation failed` with `details`):

| Rule | Field in `details` |
| --- | --- |
| `flight_date` cannot be later than tomorrow in UTC (allows for Philippine time being ahead of UTC) | `flight_date` |
| Times must follow the order `off_block` ≤ `airborne` ≤ `touchdown` ≤ `on_block` (only the ones given are compared) | the later field |
| `sta` cannot be before `std` | `sta` |
| `fuel_arrival` cannot exceed `fuel_departure` | `fuel_arrival` |
| `fuel_used` must equal `fuel_departure` − `fuel_arrival` (within 0.01) when all three are given | `fuel_used` |
| `fuel_unit` is required when any fuel quantity is given | `fuel_unit` |
| `sic_emp_UUID` must differ from `pic_emp_UUID`; `observer_emp_UUID` must differ from both | `sic_emp_UUID` / `observer_emp_UUID` |

Reference errors: `404` for unknown aircraft, flight status, flight type, delay category; crew must be **active** employees (`404 Pilot in command not found`, `400 Pilot in command is not an active employee`, same pattern for `Second in command` and `Observer`). The API does **not** check that the pilot's personnel category is "Pilot".

### GET `/api/logbook/sectors`

Query: `aircraft_UUID`, `from`, `to` (dates, inclusive), `order` (`asc` default = oldest first, or `desc`), `limit` (default 50, max 200), `offset`. Sorted by flight date, then off-block time (missing last). Returns an array and `X-Total-Count`. `from` after `to` returns `400`; an unknown aircraft returns `404`; an aircraft with no entries returns `[]`.

### PATCH `/api/logbook/sectors/:sector_UUID`

Any subset of the create fields **except `fuel_transactions`** (edit fuel rows through their own endpoints). `aircraft_UUID` can be corrected, and the entry's fuel rows follow it. `entered_by` never changes. `null` clears the nullable fields. The server only rejects problems that **this change would introduce**, so editing one field is not blocked by an older rule violation elsewhere on the record.

### Fuel transactions

**Body** for `POST .../fuel-transactions` (and each item of `fuel_transactions` on sector create):

```json
{ "issued_to": "<employee uuid>", "transaction_date": "2026-11-10", "transaction_type": "Refuel", "quantity_gal": 40, "remarks": "optional" }
```

| Field | Rule |
| --- | --- |
| `issued_to` | required; existing **active** employee (`Fuel recipient`) |
| `transaction_date` | required; cannot be later than tomorrow in UTC |
| `transaction_type` | required free text, ≤50 |
| `quantity_gal` | required number **greater than 0**, at most 2 decimals |
| `remarks` | optional (or `null`), ≤500 |

`PATCH .../fuel-transactions/:fuel_UUID` takes any subset (at least one); `remarks` can be `null`. The date is only re-checked if you send it. Responses use the fuel object shown inside the sector object above.

### POST `/api/logbook/export`

Returns a **CSV file**, not JSON.

Body (all optional, but **at least one is required**, so the whole logbook cannot be exported by accident):

```json
{ "aircraft_UUID": "…", "from": "2026-10-01", "to": "2026-10-31", "sector_UUIDs": ["…", "…"] }
```

- `sector_UUIDs`: 1 to 500 UUIDs. If any is not found the request fails with `404` and `details` lists the missing IDs (`[{ "field": "sector_UUIDs", "message": "<uuid>" }]`).
- Limit of **5000 entries** per export (`400` with a message to narrow the range). `404 No logbook records match the export request` when nothing matches. `from` after `to` returns `400`.

Success `200` headers: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="logbook-RPC1234-2026-10-01_to_2026-10-31-exported-2026-11-11.csv"`, `X-Total-Count: <number of sectors>`.

CSV layout: comma separated, CRLF line ends. The first column `record_type` is `SECTOR` or `FUEL`; **each `SECTOR` row is immediately followed by its `FUEL` rows**; columns that do not apply to a row are empty. People appear as `First Last (SA-0001)`. Text starting with `=`, `+`, `-` or `@` is prefixed with `'` so spreadsheets do not run it as a formula.

Columns, in order: `record_type, sector_UUID, aircraft_registration, flight_date, route, flight_status, flight_type, day_night, pilot_in_command, second_in_command, observer, std, sta, off_block, airborne, touchdown, on_block, flight_time, pax_count, fuel_departure, fuel_arrival, fuel_used, fuel_unit, delay_category, delay_cause, qa_check_status, entered_by, fuel_transaction_UUID, fuel_transaction_date, fuel_transaction_type, fuel_quantity_gal, fuel_issued_to, fuel_recorded_by, fuel_remarks`.

Because the request needs the `Authorization` header, a plain `<a href>` link will not work; see the [download snippet](#download-the-csv-export).

---

## 10. Reference data and known gaps

### Dropdown data: what exists today

Many forms need IDs of lookup records. Only **one** lookup endpoint exists:

| Needed for | Available? | Where to get it |
| --- | --- | --- |
| Aircraft status (`aircraft_status_UUID`) | Yes | `GET /api/aircraft/statuses` |
| Aircraft list (`aircraft_UUID`) | Yes | `GET /api/aircraft` (needs `Aircraft` feature) |
| Employees for pickers (supervisor, mechanic, assignee, PIC / SIC / observer, fuel recipient) | Partly | `GET /api/personnel/employees?record_status=Active&q=` (needs `Personnel` feature) |
| Parts | Yes | `GET /api/inventory/parts` |
| Base (`base_UUID`) | **No endpoint** | only visible inside an employee's `base` object |
| Employment status (`emp_status_UUID`) | **No endpoint** | only inside `employment_status` |
| Position (`position_UUID`) | **No endpoint** | only inside `position` |
| Personnel category (`personnel_category_UUID`) | **No endpoint** | name only inside `personnel_category` |
| Inventory location (`location_UUID`) | **No endpoint** | only the locations that already hold stock appear in a part's `locations` |
| Flight status, flight type, delay category | **No endpoint** | only inside an existing sector |
| Aircraft type, license type, renewal status | **No endpoint** | n/a |

The frontend cannot build the Create Employee form, "add initial stock" selector or Create Logbook Entry form from the API alone until the backend adds these lookup endpoints. **Ask the backend team for `GET` lookup endpoints** (ideally readable by any authenticated user).

Seeded values in the dev database (names only; IDs must be fetched, never hard-coded): bases Cebu / Manila / Davao; employment statuses Regular, Probationary, On-call, Contractual, Owner; personnel categories Pilot, Operations Personnel, Aircraft Maintenance Technician, Inventory Personnel, Quality / Safety Personnel; inventory locations Cebu Main Store, Cebu Maintenance Room, Manila Store, Davao Store; flight statuses Completed, Delayed; flight types Charter, Cargo, Positioning; delay categories Weather, Maintenance; aircraft statuses Airworthy, In Maintenance, AOG.

### Things to confirm with the backend team

1. **Feature gating can block pickers.** With the seeded positions, Captain and First Officer have `Logbook` but not `Aircraft` or `Personnel`, so they cannot load the aircraft list or crew list needed to fill in a logbook entry. Chief Aircraft Mechanic has `Maintenance` but not `Aircraft` or `Personnel`, so the same applies to AD / CPCP forms. The fix is either shared read-only lookup endpoints or adjusted position features.
2. **Malformed JSON returns `500`**, not `400`. Always send valid JSON with `Content-Type: application/json`.
3. **Inconsistent shapes:** aircraft `status` is an object in `/aircraft` but a string in maintenance and logbook summaries; license dates are ISO timestamps while employee dates are `YYYY-MM-DD`.
4. **Sessions:** no refresh endpoint (8 hour tokens); logout revocation is in server memory only.
5. **Not built yet:** endpoints for `Dashboard`, `Availability` and `Notifications`; any DELETE; photo upload; editing an employee's contacts / licenses; managing user accounts beyond create and list.

---

## 11. Frontend snippets

### API client with auth and error handling

```ts
const API = "http://localhost:5000/api";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.assign("/login"); // session ended or token invalid
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? "Request failed", body.details);
  }
  const total = res.headers.get("X-Total-Count");
  return { data: (await res.json()) as T, total: total === null ? null : Number(total) };
}
```

Careful with 401 on the login call itself: wrong credentials also return 401, so skip the redirect for `/auth/login`.

### Show field errors from a 400

```ts
try {
  await api("/personnel/employees", { method: "POST", body: JSON.stringify(form) });
} catch (e) {
  if (e instanceof ApiError && e.status === 400 && Array.isArray(e.details)) {
    // e.details: [{ field: "date_hired", message: "..." }]
    const byField = Object.fromEntries(e.details.map((d: any) => [d.field, d.message]));
    setFieldErrors(byField);
  }
}
```

### Paged list

```ts
const page = 0, pageSize = 25;
const { data, total } = await api<Employee[]>(
  `/personnel/employees?record_status=Active&limit=${pageSize}&offset=${page * pageSize}`,
);
const pageCount = Math.ceil((total ?? 0) / pageSize);
```

### Download the CSV export

```ts
async function exportLogbook(body: object) {
  const res = await fetch(`${API}/logbook/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, (await res.json()).message);

  const filename = /filename="(.+?)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "logbook.csv";
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
```

