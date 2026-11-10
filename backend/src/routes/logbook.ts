import { Router } from "express";
import { parseOrThrow, parseUuid } from "../lib/validate.js";
import {
    addFuelTransaction,
    fuelInputSchema,
} from "../services/logbook/fuel.service.js";
import {
    createSector,
    createSectorSchema,
} from "../services/logbook/sectors.service.js";

// Mounted in server.ts behind requireAuth + requireFeature(FEATURE.Logbook).
export const logbookRouter = Router();
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

// BE-16  POST /api/logbook/sectors/:sector_UUID/fuel-transactions
logbookRouter.post("/sectors/:sector_UUID/fuel-transactions", async (req, res) => {
    const sector_UUID = parseUuid(req.params.sector_UUID, "logbook entry ID");
    const input = parseOrThrow(fuelInputSchema, req.body);
    res.status(201).json(
        await addFuelTransaction(sector_UUID, input, req.user!.emp_UUID),
    );
});

