import cors from "cors";
import express from "express";
import { env } from "./lib/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { atrativosRoutes } from "./routes/atrativos.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { dashboardRoutes } from "./routes/dashboard.routes.js";
import { estabelecimentosRoutes } from "./routes/estabelecimentos.routes.js";
import { eventosRoutes } from "./routes/eventos.routes.js";
import { indicadoresRoutes } from "./routes/indicadores.routes.js";
import { registrosRoutes } from "./routes/registros.routes.js";
import { relatoriosRoutes } from "./routes/relatorios.routes.js";
import { usuariosRoutes } from "./routes/usuarios.routes.js";

export const app = express();

app.use(cors({ origin: env.FRONTEND_URL.split(",") }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "online" }));

app.use("/api/auth", authRoutes);
app.use("/api/indicadores", indicadoresRoutes);
app.use("/api/estabelecimentos", estabelecimentosRoutes);
app.use("/api/registros", registrosRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/relatorios", relatoriosRoutes);
app.use("/api/eventos", eventosRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/atrativos", atrativosRoutes);
app.use((_req, res) => res.status(404).json({ erro: "Rota não encontrada." }));
app.use(errorHandler);
