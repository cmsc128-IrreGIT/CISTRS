import { Router } from "express";
import { parseOrThrow, parseUuid } from "../lib/validate.js";
import {
    assignPartToAircraft,
    assignToAircraftSchema,
    listAircraftForPart,
    listPartsForAircraft,
    returnFromAircraftSchema,
    returnPartFromAircraft,
} from "../services/inventory/aircraft-links.service.js";
import {
    createPart,
    createPartSchema,
    getPart,
    listParts,
    listPartsQuerySchema,
    updatePart,
    updatePartSchema,
} from "../services/inventory/parts.service.js";
import {
    getStock,
    setStock,
    setStockSchema,
} from "../services/inventory/stock.service.js";

// Mounted in server.ts behind requireAuth + requireFeature(FEATURE.Inventory).
export const inventoryRouter = Router();

// -----------------------------------------------------------------------------
// BE-02: create

// POST /api/inventory/parts
// body: { part_number, part_name, unit_of_measure, min_stock_level?, description?,
//         initial_stock?: { location_UUID, quantity } }
inventoryRouter.post("/parts", async (req, res) => {
    const input = parseOrThrow(createPartSchema, req.body);
    const part = await createPart(input, req.user!.emp_UUID);
    res.status(201).json(part);
});

// -----------------------------------------------------------------------------
// BE-03: retrieve

// GET /api/inventory/parts?search=filter
// -> every part with total stock, locations, suppliers and manufacturers
inventoryRouter.get("/parts", async (req, res) => {
    const { search } = parseOrThrow(listPartsQuerySchema, req.query);
    res.json(await listParts(search));
});

// GET /api/inventory/parts/:part_UUID  -> one part (404 if it does not exist)
inventoryRouter.get("/parts/:part_UUID", async (req, res) => {
    const part_UUID = parseUuid(req.params.part_UUID, "part ID");
    res.json(await getPart(part_UUID));
});

// -----------------------------------------------------------------------------
// BE-04: update

// PATCH /api/inventory/parts/:part_UUID
// body: any subset of { part_number, part_name, unit_of_measure,
//                       min_stock_level, description (null clears it) }
inventoryRouter.patch("/parts/:part_UUID", async (req, res) => {
    const part_UUID = parseUuid(req.params.part_UUID, "part ID");
    const input = parseOrThrow(updatePartSchema, req.body);
    res.json(await updatePart(part_UUID, input));
});

// -----------------------------------------------------------------------------
// BE-06: quantity and availability

// GET /api/inventory/parts/:part_UUID/stock
// -> total + per-location quantity, with availability
inventoryRouter.get("/parts/:part_UUID/stock", async (req, res) => {
    const part_UUID = parseUuid(req.params.part_UUID, "part ID");
    res.json(await getStock(part_UUID));
});

// PUT /api/inventory/parts/:part_UUID/stock/:location_UUID
// body: { quantity (whole number, 0 or more), remarks? }
// Sets the quantity at that location (creates the stock row if needed) and
// records the change in the history. Availability follows the new quantity.
inventoryRouter.put("/parts/:part_UUID/stock/:location_UUID", async (req, res) => {
    const part_UUID = parseUuid(req.params.part_UUID, "part ID");
    const location_UUID = parseUuid(req.params.location_UUID, "location ID");
    const input = parseOrThrow(setStockSchema, req.body);
    res.json(await setStock(part_UUID, location_UUID, input, req.user!.emp_UUID));
});

// -----------------------------------------------------------------------------
// BE-05: aircraft <-> inventory

// POST /api/inventory/parts/:part_UUID/aircraft
// body: { aircraft_UUID, location_UUID, quantity (1+), remarks? }
// Assigns stock of the part to an aircraft (400/404 for invalid aircraft).
inventoryRouter.post("/parts/:part_UUID/aircraft", async (req, res) => {
    const part_UUID = parseUuid(req.params.part_UUID, "part ID");
    const input = parseOrThrow(assignToAircraftSchema, req.body);
    res.status(201).json(
        await assignPartToAircraft(part_UUID, input, req.user!.emp_UUID),
    );
});

// POST /api/inventory/parts/:part_UUID/aircraft/:aircraft_UUID/return
// body: { location_UUID, quantity (1+), remarks? }
inventoryRouter.post(
    "/parts/:part_UUID/aircraft/:aircraft_UUID/return",
    async (req, res) => {
        const part_UUID = parseUuid(req.params.part_UUID, "part ID");
        const aircraft_UUID = parseUuid(req.params.aircraft_UUID, "aircraft ID");
        const input = parseOrThrow(returnFromAircraftSchema, req.body);
        res.json(
            await returnPartFromAircraft(
                part_UUID,
                aircraft_UUID,
                input,
                req.user!.emp_UUID,
            ),
        );
    },
);

// GET /api/inventory/parts/:part_UUID/aircraft  -> aircraft this part is on
inventoryRouter.get("/parts/:part_UUID/aircraft", async (req, res) => {
    const part_UUID = parseUuid(req.params.part_UUID, "part ID");
    res.json(await listAircraftForPart(part_UUID));
});

// GET /api/inventory/aircraft/:aircraft_UUID/parts  -> inventory on an aircraft
inventoryRouter.get("/aircraft/:aircraft_UUID/parts", async (req, res) => {
    const aircraft_UUID = parseUuid(req.params.aircraft_UUID, "aircraft ID");
    res.json(await listPartsForAircraft(aircraft_UUID));
});


});
