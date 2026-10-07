import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import movementsRouter from "./routes/movements.js";
import catalogRouter from "./routes/catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "..");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/movements", movementsRouter);
app.use("/api", catalogRouter);

app.use("/api", (_req, res) => res.status(404).json({ error: "No existe el recurso." }));

app.use(express.static(frontendRoot));

app.use((error, _req, res, _next) => {
    if (error.expose) {
        res.status(error.status ?? 400).json({ error: error.message });
        return;
    }
    console.error("[finanza] Error de servidor:", error);
    res.status(500).json({ error: "Error interno del servidor." });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
    console.log(`Finanza (API + frontend) -> http://localhost:${port}`);
    console.log(`Modo frontend: mock por defecto. Activa la API con  ?data=api`);
});