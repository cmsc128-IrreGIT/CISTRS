import { Router } from "express";
import {
    listEmployees,
    listExpiringLicenses,
} from "../services/personnel.service.js";

export const personnelRouter = Router();

// GET /api/personnel/employees -> employees with base, status, contacts, licenses
personnelRouter.get("/employees", async (_req, res) => {
    res.json(await listEmployees());
});

// GET /api/personnel/licenses/expiring?days=60 -> licenses expiring soon
personnelRouter.get("/licenses/expiring", async (req, res) => {
    const days = Math.max(1, Number(req.query.days ?? 60) || 60);
    res.json(await listExpiringLicenses(days));
});
