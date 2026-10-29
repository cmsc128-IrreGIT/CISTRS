import { Router } from "express";
import { parseOrThrow, parseUuid } from "../lib/validate.js";
import {
    createPart,
    createPartSchema,
    getPart,
    listParts,
    listPartsQuerySchema,
    listTransactions,
    updatePart,
    updatePartSchema,
} from "../services/inventory.service.js";

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
// Supporting: transaction history

// GET /api/inventory/transactions  -> latest 50 stock movements
inventoryRouter.get("/transactions", async (_req, res) => {
    res.json(await listTransactions());
});