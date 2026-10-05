"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const PORT = 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        message: "CISTRS backend is running!",
    });
});
app.listen(PORT, () => {
    console.log(`CISTRS backend running on http://localhost:${PORT}`);
});
