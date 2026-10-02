import fs from "node:fs";
import { app } from "./app.js";
import { env } from "./lib/env.js";
import { PASTA_UPLOADS } from "./routes/relatorios.routes.js";

fs.mkdirSync(PASTA_UPLOADS, { recursive: true });

app.listen(env.PORT, () => {
  console.log(`API do Observatório rodando em http://localhost:${env.PORT}/api`);
});
