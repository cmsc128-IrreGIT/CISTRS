import { Router } from "express";
import { listParts, listTransactions } from "../services/inventory.service.js";

export const inventoryRouter = Router();

// GET /api/inventory/parts  -> every part with total stock and its suppliers
inventoryRouter.get("/parts", async (_req, res) => {
    res.json(await listParts());
});

// GET /api/inventory/transactions  -> latest 50 stock movements
inventoryRouter.get("/transactions", async (_req, res) => {
    res.json(await listTransactions());
});
