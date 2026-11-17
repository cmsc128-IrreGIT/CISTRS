# CISTRS Frontend–Backend Integration Handoff

**Branch:** `frontend/ui-refinement`
**Purpose:** Help the integration team connect the existing UI to backend APIs without replacing established layouts or workflows.

The frontend is implemented across the main CISTRS modules, but not all features save data to the backend. **Live** means an API call exists; **preview** means the current UI uses frontend data or temporary state. A passing mock test does not establish live integration.

## Integration status

| Module | Current state | Remaining work |
| --- | --- | --- |
| Authentication / Profile | Live login and session APIs; local changes support employee full names. | Verify login, session restore, logout, and names across staff accounts. |
| Dashboard | Mixed: live Inventory data; preview Aircraft, Maintenance, Logbook, Availability, and Personnel count. | Replace preview counts with authorized live records. |
| Inventory | Live parts listing, details, create/update, and transaction history. Some stock requests and correction flows use previews. | Check stock operations, payload fields, and persistence. |
| Aircraft | Fleet and status workflows currently use a preview store. | Connect to existing `/api/aircraft` routes and align identifiers/statuses. |
| Maintenance | Work records and task screens currently use previews. | Map UI records to backend maintenance routes and supported fields. |
| Technical Logbook | Entries and export interface use preview data. | Connect sector, fuel, and export APIs; verify field mapping. |
| Personnel | Live Personnel API for authorized users; limited read-only directory endpoint for other authenticated staff. | Verify actual account permissions and approved directory fields. Personnel edits/documents may still be previews. |
| Availability | Directory shows an Availability column; authorized users have a recording tab. Records use an in-memory preview store. | Agree with backend team on persistent records and read/write API before integration. |
| User Accounts | Live account listing and creation; duty/status edits are previews. | Connect only supported management actions and verify position-based access. |
| Notifications / Settings | Inbox, preferences, and some settings use frontend preview state. | Confirm which operations need backend persistence. |

## Where to work

- **Shared API and sessions:** `src/shared/api/client.ts`, `src/features/auth/`, `src/app/app_routes.tsx`
- **Already connected areas:** `src/features/inventory/services/inventory_services.ts`, `src/features/personnel/services/personnel_service.ts`, `src/features/user_management/services/`
- **Preview service adapters:** `src/features/aircraft/services/aircraft_service.ts`, `src/features/maintenance/services/maintenance_service.ts`, `src/features/logbook/services/logbook_service.ts`, `src/features/personnel/services/availability_service.ts`
- **Dashboard and notifications:** `src/features/dashboard/hooks/use_dashboard_summary.ts`, `src/features/notifications/services/notification_service.ts`
- **Backend reference:** `backend/API_DOCUMENTATION.md`, `backend/src/routes/`, `backend/src/config/permissions.ts`

The current backend has Aircraft, Maintenance, and Logbook routes, but the frontend service adapters have not yet been fully connected. Check request/response contracts before replacing preview stores.

## Access and data rules

- **Regular staff:** Can view the basic Personnel Directory and Availability column, without the management Action column.
- **Authorized Availability users:** Can open the existing Availability tab and record preview entries. These entries are **not shared, persistent backend records**.
- **Personnel and account management:** Continue to follow backend permissions. Hiding a button or route on the frontend does not replace API authorization.
- **Local backend additions:** Full-name support and `GET /api/personnel/directory` were added locally for frontend needs. Review with the backend team before treating them as part of remote `dev`.

## Integration checklist

- [ ] Compare frontend service types and payloads with current backend routes, IDs, status values, and errors.
- [ ] Connect Aircraft, Maintenance, and Logbook through their existing service files.
- [ ] Complete supported Inventory and account workflows; do not present preview saves as persisted data.
- [ ] Agree on the Availability data model and permissions with the backend team before adding persistence.
- [ ] Test normal and restricted accounts, including direct API access, not only hidden UI controls.
- [ ] Verify saved records remain after refresh and that Dashboard counts match live records.
- [ ] Update this table as each integration is confirmed in a running environment.

## Verification

From the repository root:

```powershell
npm --prefix backend run typecheck
npm --prefix frontend run typecheck
cd frontend
npx tsc -p tests/tsconfig.json --noEmit
npm run test
```

**Latest reported frontend result:** 139/139 tests passed across 24 files. Many tests use mocks or preview stores, so live API behavior and persistence still require manual verification.

The backend updates from `dev` were merged locally in commit `4e32056`. Preserve the existing UI and coordinate new backend endpoints or schema changes with the backend team.
