"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { normalizeProfileInput } from "@/lib/nutrition/calc"

export type ProfileActionResult = { ok: true } | { ok: false; error: string }

export async function saveNutritionProfile(raw: unknown): Promise<ProfileActionResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) throw new Error("Non authentifié")
    const { age, ...profile } = normalizeProfileInput(raw)
    const userId = session.user.id

    await prisma.$transaction([
      prisma.nutritionProfile.upsert({
        where: { userId },
        create: { userId, ...profile },
        update: profile,
      }),
      // L'âge est partagé avec la page profil
      prisma.user.update({ where: { id: userId }, data: { age } }),
    ])
    revalidatePath("/nutrition", "layout")
    return { ok: true }
  } catch (err) {
    console.error("[nutrition:profile]", err)
    return { ok: false, error: err instanceof Error ? err.message : "Une erreur est survenue." }
  }
}
