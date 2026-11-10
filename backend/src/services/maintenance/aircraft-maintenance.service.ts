import { listAdRecords } from "./ad-records.service.js";
import { listCpcpTasks } from "./cpcp-tasks.service.js";
import { findAircraftOr404, toAircraftSummary } from "./shared.js";

// =============================================================================
// Everything maintenance-related about ONE aircraft, in one response (BE-10)
//   GET /api/maintenance/aircraft/:aircraft_UUID
//
// Answers "can this aircraft be used?": its status and hours, every AD record
// and CPCP task, and how many of them are overdue.
// =============================================================================

export async function getAircraftMaintenance(aircraft_UUID: string) {
    const aircraft = await findAircraftOr404(aircraft_UUID);

    // This view is not paged: it must show every record to count overdue ones
    // correctly. (The 200 cap applies to the list endpoints' query only.)
    const all = { aircraft_UUID, limit: 10_000, offset: 0 };
    const [ads, cpcp] = await Promise.all([
        listAdRecords(all),
        listCpcpTasks(all),
    ]);

    return {
        aircraft: toAircraftSummary(aircraft),
        overdue_count:
            ads.records.filter((r) => r.overdue).length +
            cpcp.records.filter((r) => r.overdue).length,
        ad_records: ads.records,
        cpcp_tasks: cpcp.records,
    };
}
