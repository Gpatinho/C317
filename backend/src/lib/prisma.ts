import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

// O Prisma 7 conversa com o MySQL através de um "driver adapter".
// O adapter do MariaDB funciona normalmente com MySQL 8.
const url = new URL(env.DATABASE_URL);

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ""),
  connectionLimit: 5,
  // Necessário no MySQL 8 (autenticação caching_sha2_password sem SSL)
  allowPublicKeyRetrieval: true,
});

export const prisma = new PrismaClient({ adapter });
