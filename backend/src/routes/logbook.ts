import { Router } from "express";
import { parseOrThrow, parseUuid } from "../lib/validate.js";
import { exportLogbook, exportSchema } from "../services/logbook/export.service.js";
import {
    addFuelTransaction,
    fuelInputSchema,
    getFuelTransaction,
    updateFuelSchema,
    updateFuelTransaction,
} from "../services/logbook/fuel.service.js";
import {
    createSector,
    createSectorSchema,
    getSector,
    listSectors,
    listSectorsSchema,
    updateSector,
    updateSectorSchema,
} from "../services/logbook/sectors.service.js";

// Mounted in server.ts behind requireAuth + requireFeature(FEATURE.Logbook).
export const logbookRouter = Router();

// A logbook entry is a flight sector plus the fuel transactions linked to it.

// =============================================================================
// Entries (flight sectors)

// BE-16  POST /api/logbook/sectors
// body: { aircraft_UUID, flight_status_UUID, flight_type_UUID, pic_emp_UUID,
//         flight_date (YYYY-MM-DD), route,
//         sic_emp_UUID?, observer_emp_UUID?, delay_category_UUID?, delay_cause?,
//         std? sta? off_block? airborne? touchdown? on_block? (ISO timestamps),
//         flight_time?, day_night? ("Day"|"Night"), pax_count?,
//         fuel_departure? fuel_arrival? fuel_used? fuel_unit?, qa_check_status?,
//         fuel_transactions?: [{ issued_to, transaction_date,
//                                transaction_type, quantity_gal, remarks? }] }
// entry_by is the logged-in employee.
logbookRouter.post("/sectors", async (req, res) => {
    const input = parseOrThrow(createSectorSchema, req.body);
    res.status(201).json(await createSector(input, req.user!.emp_UUID));
});

// BE-17  GET /api/logbook/sectors?aircraft_UUID=&from=&to=&order=asc|desc&limit=&offset=
// -> chronological (oldest first unless order=desc); X-Total-Count = total matches
logbookRouter.get("/sectors", async (req, res) => {
    const query = parseOrThrow(listSectorsSchema, req.query);
    const { total, records } = await listSectors(query);
    res.set("X-Total-Count", String(total)).json(records);
});

// BE-17  GET /api/logbook/sectors/:sector_UUID  (404 if it does not exist)
logbookRouter.get("/sectors/:sector_UUID", async (req, res) => {
    const sector_UUID = parseUuid(req.params.sector_UUID, "logbook entry ID");
    res.json(await getSector(sector_UUID));
});

// BE-18  PATCH /api/logbook/sectors/:sector_UUID
// body: any subset of the editable fields (null clears an optional field)
logbookRouter.patch("/sectors/:sector_UUID", async (req, res) => {
    const sector_UUID = parseUuid(req.params.sector_UUID, "logbook entry ID");
    const input = parseOrThrow(updateSectorSchema, req.body);
    res.json(await updateSector(sector_UUID, input));
});

// =============================================================================
// Fuel transactions linked to an entry

// BE-16  POST /api/logbook/sectors/:sector_UUID/fuel-transactions
logbookRouter.post("/sectors/:sector_UUID/fuel-transactions", async (req, res) => {
    const sector_UUID = parseUuid(req.params.sector_UUID, "logbook entry ID");
    const input = parseOrThrow(fuelInputSchema, req.body);
    res.status(201).json(
        await addFuelTransaction(sector_UUID, input, req.user!.emp_UUID),
    );
});

// BE-17  GET /api/logbook/fuel-transactions/:fuel_UUID
logbookRouter.get("/fuel-transactions/:fuel_UUID", async (req, res) => {
    const fuel_UUID = parseUuid(req.params.fuel_UUID, "fuel transaction ID");
    res.json(await getFuelTransaction(fuel_UUID));
});

// BE-18  PATCH /api/logbook/fuel-transactions/:fuel_UUID
logbookRouter.patch("/fuel-transactions/:fuel_UUID", async (req, res) => {
    const fuel_UUID = parseUuid(req.params.fuel_UUID, "fuel transaction ID");
    const input = parseOrThrow(updateFuelSchema, req.body);
    res.json(await updateFuelTransaction(fuel_UUID, input));
});

// =============================================================================
// Export

// BE-19  POST /api/logbook/export
// body: { aircraft_UUID?, from?, to?, sector_UUIDs? }  (at least one)
// -> a CSV file download (one SECTOR row per entry, each followed by its FUEL
//    rows). 400 for a bad request, 404 when nothing matches. The whole file is
//    built before anything is sent, so a failure never produces a partial file.
logbookRouter.post("/export", async (req, res) => {
    const input = parseOrThrow(exportSchema, req.body);
    const { csv, total, filename } = await exportLogbook(input);
    res
        .status(200)
        .set({
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "X-Total-Count": String(total),
        })
        .send(csv);
});
