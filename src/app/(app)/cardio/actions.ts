"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { normalizeWodInput, type WodInput } from "@/lib/cardio/wod-input"
import {
  MAX_ELAPSED_SECONDS,
  MAX_ROUNDS,
  MAX_EXTRA_REPS,
  MAX_SESSION_AGE_MS,
} from "@/lib/cardio/limits"

export type SaveCardioSessionInput = {
  programId: string
  startedAt: string
  completedAt: string
  elapsedSeconds: number
  roundsCompleted: number | null
  extraReps: number | null
}

const FIVE_MINUTES_MS = 5 * 60 * 1000

export async function saveCardioSession(
  input: SaveCardioSessionInput,
  clientRequestId: string
): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  if (!clientRequestId) throw new Error("Identifiant de requête manquant")
  const existing = await prisma.userCardioSession.findUnique({ where: { clientRequestId } })
  if (existing) return

  if (typeof input.programId !== "string" || !input.programId) throw new Error("WOD introuvable")
  const program = await prisma.cardioProgram.findFirst({
    where: { id: input.programId, OR: [{ userId: null }, { userId: session.user.id }] },
    select: { format: true },
  })
  if (!program) throw new Error("WOD introuvable")

  const startedAt = new Date(input.startedAt)
  const completedAt = new Date(input.completedAt)
  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(completedAt.getTime())) {
    throw new Error("Dates invalides")
  }
  if (startedAt.getTime() > completedAt.getTime()) throw new Error("Dates incohérentes")
  const now = Date.now()
  for (const date of [startedAt, completedAt]) {
    if (date.getTime() < now - MAX_SESSION_AGE_MS || date.getTime() > now + FIVE_MINUTES_MS) {
      throw new Error("Date hors limites")
    }
  }

  if (
    !Number.isInteger(input.elapsedSeconds) ||
    input.elapsedSeconds < 1 ||
    input.elapsedSeconds > MAX_ELAPSED_SECONDS
  ) {
    throw new Error("Durée invalide")
  }

  if (program.format !== "AMRAP") {
    if (input.roundsCompleted !== null || input.extraReps !== null) {
      throw new Error("Tours autorisés uniquement pour un AMRAP")
    }
  } else {
    if (
      input.roundsCompleted !== null &&
      (!Number.isInteger(input.roundsCompleted) || input.roundsCompleted < 0 || input.roundsCompleted > MAX_ROUNDS)
    ) {
      throw new Error("Nombre de tours invalide")
    }
    if (
      input.extraReps !== null &&
      (!Number.isInteger(input.extraReps) || input.extraReps < 0 || input.extraReps > MAX_EXTRA_REPS)
    ) {
      throw new Error("Nombre de répétitions invalide")
    }
  }

  try {
    await prisma.userCardioSession.create({
      data: {
        userId: session.user.id,
        programId: input.programId,
        startedAt,
        completedAt,
        elapsedSeconds: input.elapsedSeconds,
        roundsCompleted: input.roundsCompleted,
        extraReps: input.extraReps,
        clientRequestId,
      },
    })
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") return
    throw err
  }
}

// ==========================================
// WOD perso (création / modification / suppression)
// ==========================================

export type WodActionResult = { ok: true; id: string } | { ok: false; error: string }

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")
  return session.user.id
}

/** Construit les étapes à écrire, et la liste du matériel déduite des mouvements choisis. */
async function buildSteps(input: WodInput) {
  const ids = [...new Set(input.steps.map((s) => s.cardioExerciseId))]
  const exercises = await prisma.cardioExercise.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, equipment: true },
  })
  const byId = new Map(exercises.map((e) => [e.id, e]))
  if (byId.size !== ids.length) throw new Error("Un des mouvements n'existe plus.")

  const steps = input.steps.map((step, i) => ({
    order: i + 1,
    cardioExerciseId: step.cardioExerciseId,
    durationSec: step.durationSec,
    reps: step.reps,
    distanceM: step.distanceM,
    intensity: byId.get(step.cardioExerciseId)!.name === "Repos" ? ("FAIBLE" as const) : ("MOYENNE" as const),
  }))
  const equipmentList = [...new Set(exercises.map((e) => e.equipment).filter((e): e is string => !!e))]
  return { steps, equipment: equipmentList.length > 0 ? equipmentList.join(", ") : null }
}

function toResult(err: unknown): WodActionResult {
  console.error("[cardio:wod]", err)
  return { ok: false, error: err instanceof Error ? err.message : "Une erreur est survenue." }
}

export async function createWod(raw: unknown): Promise<WodActionResult> {
  try {
    const userId = await requireUserId()
    const input = normalizeWodInput(raw)
    const count = await prisma.cardioProgram.count({ where: { userId } })
    if (count >= 100) throw new Error("Tu as atteint la limite de 100 WOD perso.")
    const { steps, equipment } = await buildSteps(input)

    const wod = await prisma.cardioProgram.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        image: input.image,
        format: input.format,
        level: input.level,
        durationMin: input.durationMin,
        equipment,
        steps: { create: steps },
      },
      select: { id: true },
    })
    revalidatePath("/cardio")
    return { ok: true, id: wod.id }
  } catch (err) {
    return toResult(err)
  }
}

export async function updateWod(id: string, raw: unknown): Promise<WodActionResult> {
  try {
    const userId = await requireUserId()
    const owned = await prisma.cardioProgram.findFirst({ where: { id, userId }, select: { id: true } })
    if (!owned) throw new Error("WOD introuvable.")
    const input = normalizeWodInput(raw)
    const { steps, equipment } = await buildSteps(input)

    await prisma.$transaction([
      prisma.cardioStep.deleteMany({ where: { programId: id } }),
      prisma.cardioProgram.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          image: input.image,
          format: input.format,
          level: input.level,
          durationMin: input.durationMin,
          equipment,
          steps: { create: steps },
        },
      }),
    ])
    revalidatePath("/cardio")
    revalidatePath(`/cardio/${id}`)
    return { ok: true, id }
  } catch (err) {
    return toResult(err)
  }
}

export async function deleteWod(id: string): Promise<WodActionResult> {
  try {
    const userId = await requireUserId()
    const owned = await prisma.cardioProgram.findFirst({ where: { id, userId }, select: { id: true } })
    if (!owned) throw new Error("WOD introuvable.")
    // UserCardioSession → CardioProgram n'a pas de cascade : on supprime l'historique de ce WOD avec lui.
    await prisma.$transaction([
      prisma.userCardioSession.deleteMany({ where: { programId: id, userId } }),
      prisma.cardioProgram.delete({ where: { id } }),
    ])
    revalidatePath("/cardio")
    revalidatePath("/cardio/historique")
    return { ok: true, id }
  } catch (err) {
    return toResult(err)
  }
}
