"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { normalizeProfileInput } from "@/lib/nutrition/calc"
import { adviseAdjustment, dayToDate, normalizeWeight, normalizeWeightDay, parisDay, trendWindowStart } from "@/lib/nutrition/weight"

export type ProfileActionResult = { ok: true } | { ok: false; error: string }

async function requireUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")
  return session.user.id
}

function failure(tag: string, err: unknown): ProfileActionResult {
  console.error(`[nutrition:${tag}]`, err)
  return { ok: false, error: err instanceof Error ? err.message : "Une erreur est survenue." }
}

export async function saveNutritionProfile(raw: unknown): Promise<ProfileActionResult> {
  try {
    const userId = await requireUserId()
    const { age, ...profile } = normalizeProfileInput(raw)
    const previous = await prisma.nutritionProfile.findUnique({ where: { userId }, select: { goal: true } })
    // Un ajustement calculé pour une sèche n'a plus de sens en prise de masse : on repart de zéro.
    const resetAdjustment = previous !== null && previous.goal !== profile.goal
    const date = dayToDate(parisDay())

    await prisma.$transaction([
      prisma.nutritionProfile.upsert({
        where: { userId },
        create: { userId, ...profile },
        update: { ...profile, ...(resetAdjustment ? { calorieAdjustment: 0, adjustedAt: new Date() } : {}) },
      }),
      // L'âge est partagé avec la page profil
      prisma.user.update({ where: { id: userId }, data: { age } }),
      // Le poids saisi compte comme la pesée du jour
      prisma.weightEntry.upsert({
        where: { userId_date: { userId, date } },
        create: { userId, date, weightKg: profile.weightKg },
        update: { weightKg: profile.weightKg },
      }),
    ])
    revalidatePath("/nutrition", "layout")
    return { ok: true }
  } catch (err) {
    return failure("profile", err)
  }
}

/** Les besoins se calculent avec la pesée la plus récente. */
async function syncProfileWeight(userId: string) {
  const latest = await prisma.weightEntry.findFirst({ where: { userId }, orderBy: { date: "desc" } })
  if (latest) {
    await prisma.nutritionProfile.updateMany({ where: { userId }, data: { weightKg: latest.weightKg } })
  }
}

export async function logWeight(raw: unknown, rawDay?: unknown): Promise<ProfileActionResult> {
  try {
    const userId = await requireUserId()
    const weightKg = normalizeWeight(raw)
    const date = dayToDate(normalizeWeightDay(rawDay))

    await prisma.weightEntry.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, weightKg },
      update: { weightKg },
    })
    await syncProfileWeight(userId)
    revalidatePath("/nutrition", "layout")
    return { ok: true }
  } catch (err) {
    return failure("weight", err)
  }
}

export async function deleteWeight(id: string): Promise<ProfileActionResult> {
  try {
    const userId = await requireUserId()
    const { count } = await prisma.weightEntry.deleteMany({ where: { id, userId } })
    if (count === 0) throw new Error("Pesée introuvable.")
    await syncProfileWeight(userId)
    revalidatePath("/nutrition", "layout")
    return { ok: true }
  } catch (err) {
    return failure("weight-delete", err)
  }
}

/** Applique la correction proposée, recalculée ici plutôt que reçue du client. */
export async function applyCalorieAdjustment(): Promise<ProfileActionResult> {
  try {
    const userId = await requireUserId()
    const profile = await prisma.nutritionProfile.findUnique({ where: { userId } })
    if (!profile) throw new Error("Calcule d'abord tes besoins.")

    const points = await prisma.weightEntry.findMany({
      where: { userId, date: { gte: trendWindowStart(parisDay(), profile.adjustedAt) } },
      select: { date: true, weightKg: true },
    })
    const advice = adviseAdjustment(profile.goal, profile.weightKg, points, profile.calorieAdjustment)
    if (advice.status !== "adjust") throw new Error("Aucun ajustement à appliquer pour le moment.")

    await prisma.nutritionProfile.update({
      where: { userId },
      data: { calorieAdjustment: profile.calorieAdjustment + advice.delta, adjustedAt: new Date() },
    })
    revalidatePath("/nutrition", "layout")
    return { ok: true }
  } catch (err) {
    return failure("adjust", err)
  }
}
