import { Router } from "express";
import { parseOrThrow, parseUuid } from "../lib/validate.js";
import {
    listExpiringLicenses,
} from "../services/personnel.service.js";

// Mounted in server.ts behind requireAuth + requireFeature(FEATURE.Personnel).
export const personnelRouter = Router();

// GET /api/personnel/licenses/expiring?days=60 -> licenses expiring soon
personnelRouter.get("/licenses/expiring", async (req, res) => {
    const days = Math.max(1, Number(req.query.days ?? 60) || 60);
    res.json(await listExpiringLicenses(days));
});
