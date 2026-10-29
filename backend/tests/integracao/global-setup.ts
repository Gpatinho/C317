import { execSync } from "node:child_process";
import type { TestProject } from "vitest/node";

// Roda uma vez antes de todos os testes de integração: cria o banco de teste (se ainda
// não existir) e aplica as migrations pendentes, o mesmo comando usado no deploy.
// Não precisa apagar nada aqui: cada teste já começa com as tabelas vazias (setup.ts).
export default function setup(project: TestProject) {
  const DATABASE_URL = project.config.env.DATABASE_URL;
  try {
    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL },
      stdio: "pipe",
    });
  } catch (erro) {
    const { stdout, stderr, message } = erro as { stdout?: Buffer; stderr?: Buffer; message: string };
    // console.error em vez de só lançar: o Vitest às vezes não consegue exibir erros do globalSetup
    console.error(
      "\nNão foi possível preparar o banco de teste. O MySQL está ligado?\n" +
        (stdout?.toString() ?? "") + (stderr?.toString() ?? message),
    );
    throw erro;
  }
}
