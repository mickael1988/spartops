"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin"

const BAN_DURATIONS = { "1j": 60 * 60 * 24, "7j": 60 * 60 * 24 * 7, "30j": 60 * 60 * 24 * 30, definitif: null } as const
export type BanDuration = keyof typeof BAN_DURATIONS

export async function banUser(userId: string, duration: BanDuration, reason: string): Promise<void> {
  const session = await requireAdmin()
  if (userId === session.user.id) throw new Error("Tu ne peux pas te bannir toi-même")
  if (!(duration in BAN_DURATIONS)) throw new Error("Durée invalide")

  const banReason = reason.trim().slice(0, 300) || undefined
  const banExpiresIn = BAN_DURATIONS[duration] ?? undefined

  // Le plugin admin révoque aussi toutes les sessions de l'utilisateur : il est déconnecté immédiatement.
  await auth.api.banUser({ headers: await headers(), body: { userId, banReason, banExpiresIn } })
  revalidatePath("/admin")
}

export async function unbanUser(userId: string): Promise<void> {
  await requireAdmin()
  await auth.api.unbanUser({ headers: await headers(), body: { userId } })
  revalidatePath("/admin")
}

export async function deleteUser(userId: string): Promise<void> {
  const session = await requireAdmin()
  if (userId === session.user.id) throw new Error("Tu ne peux pas supprimer ton propre compte")

  // ProgramDay → Workout est en onDelete: Restrict : on supprime d'abord les programmes,
  // sinon la suppression en cascade de l'utilisateur peut échouer selon l'ordre des cascades.
  await prisma.program.deleteMany({ where: { userId } })
  await auth.api.removeUser({ headers: await headers(), body: { userId } })
  revalidatePath("/admin")
}
