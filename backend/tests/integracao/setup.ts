import { afterAll, beforeEach } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { limparBanco } from "./helpers.js";

// Cada teste começa com o banco vazio, sem depender da ordem dos outros
beforeEach(limparBanco);

afterAll(() => prisma.$disconnect());
