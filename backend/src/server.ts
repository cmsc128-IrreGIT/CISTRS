import "dotenv/config";
import cors from "cors";
import express from "express";
import { FEATURE } from "./config/permissions.js";
import { prisma } from "./lib/prisma.js";

// middleware
import { requireAuth, requireFeature } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";

// routes
import { aircraftRouter } from "./routes/aircraft.js";
import { authRouter } from "./routes/auth.js";
import { inventoryRouter } from "./routes/inventory.js";
import { logbookRouter } from "./routes/logbook.js";
import { maintenanceRouter } from "./routes/maintenance.js";
import { personnelRouter } from "./routes/personnel.js";
import { usersRouter } from "./routes/users.js";

const app = express();
const port = Number(process.env.PORT ?? 5000);

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// PUBLIC routes: no token needed
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "CISTRS backend is running!" });
});

// /api/auth/login is public. /me and /logout check the token themselves.
app.use("/api/auth", authRouter);


// ---------------------------------------------------------------------------
// PROTECTED routes: everything below this line needs a valid token
app.use("/api", requireAuth);

// Each module also needs its own feature (granted through the user's roles).
app.use("/api/users", requireFeature(FEATURE.UserAccounts), usersRouter);
app.use("/api/inventory", requireFeature(FEATURE.Inventory), inventoryRouter);
app.use("/api/aircraft", requireFeature(FEATURE.Aircraft), aircraftRouter);
app.use("/api/logbook", requireFeature(FEATURE.Logbook), logbookRouter);
app.use("/api/maintenance", requireFeature(FEATURE.Maintenance), maintenanceRouter);
app.use("/api/personnel", requireFeature(FEATURE.Personnel), personnelRouter);

// Unknown /api paths answer with JSON instead of Express's HTML 404 page.
app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);	// Must be the LAST app.use

const server = app.listen(port, () => {
    console.log(`CISTRS backend running on http://localhost:${port}`);
});

// Close the server and the database connection on Ctrl+C.
async function shutdown() {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
