import { notFound } from "next/navigation"
import { getSession } from "@/lib/session"

export function isAdmin(user: { role?: string | null } | undefined | null): boolean {
  return user?.role === "admin"
}

/**
 * À appeler en tête de chaque page / action admin.
 * Un non-admin reçoit une 404 : on ne révèle pas l'existence de l'espace admin.
 */
export async function requireAdmin() {
  const session = await getSession()
  if (!session || !isAdmin(session.user)) notFound()
  return session
}
