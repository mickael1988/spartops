import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

/**
 * Prisma dev génère une URL `prisma+postgres://` (HTTP proxy).
 * @prisma/adapter-pg a besoin d'une URL TCP directe `postgresql://`.
 * Cette fonction extrait l'URL TCP depuis l'api_key encodée en base64.
 */
function getTcpConnectionString(url: string): string {
  if (!url.startsWith("prisma+postgres://")) {
    return url
  }
  try {
    const parsed = new URL(url)
    const apiKey = parsed.searchParams.get("api_key")
    if (!apiKey) throw new Error("api_key manquant dans DATABASE_URL")
    const decoded = JSON.parse(Buffer.from(apiKey, "base64").toString("utf8"))
    return decoded.databaseUrl
  } catch {
    throw new Error("Impossible de décoder la DATABASE_URL prisma+postgres://")
  }
}

/**
 * pg traite déjà `sslmode=prefer|require|verify-ca` comme `verify-full`, mais affiche un
 * SECURITY WARNING à chaque connexion (ces modes s'affaibliront dans pg v9).
 * On écrit explicitement `verify-full` : même sécurité qu'aujourd'hui, plus d'avertissement,
 * et pas d'affaiblissement silencieux lors d'une future montée de version.
 */
function withExplicitSslMode(url: string): string {
  try {
    const parsed = new URL(url)
    const mode = parsed.searchParams.get("sslmode")
    if (mode === "prefer" || mode === "require" || mode === "verify-ca") {
      parsed.searchParams.set("sslmode", "verify-full")
      return parsed.toString()
    }
    return url
  } catch {
    return url
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = withExplicitSslMode(getTcpConnectionString(process.env.DATABASE_URL!))
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
