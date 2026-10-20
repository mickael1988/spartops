import type { WodFormat } from "./timeline"

export type WodLevel = "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE"

export const WOD_EMOJIS = ["🔥", "💪", "⚡", "🏃", "🥊", "🚴", "⛰️", "🎯", "🫀", "🌪️"] as const

export const WOD_LIMITS = {
  nameMax: 60,
  descriptionMax: 300,
  stepsMax: 40,
  durationMinMax: 120,
  stepDurationSec: { min: 5, max: 600 },
  reps: { min: 1, max: 1000 },
  distanceM: { min: 10, max: 50_000 },
} as const

export type WodStepInput = {
  cardioExerciseId: string
  durationSec: number | null
  reps: number | null
  distanceM: number | null
}

export type WodInput = {
  name: string
  description: string
  image: string | null
  format: WodFormat
  level: WodLevel
  /** Ignoré pour CIRCUIT (calculé à partir des étapes). */
  durationMin: number
  steps: WodStepInput[]
}

const FORMATS: readonly WodFormat[] = ["CIRCUIT", "AMRAP", "EMOM", "FOR_TIME"]
const LEVELS: readonly WodLevel[] = ["DEBUTANT", "INTERMEDIAIRE", "AVANCE"]

/** CIRCUIT et EMOM déroulent des phases minutées ; AMRAP et FOR_TIME comptent des reps ou une distance. */
export function isTimedFormat(format: WodFormat): boolean {
  return format === "CIRCUIT" || format === "EMOM"
}

function isIntIn(value: unknown, range: { min: number; max: number }): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= range.min && value <= range.max
}

/** Valide et normalise une saisie venant du client. Lève une Error au message affichable. */
export function normalizeWodInput(raw: unknown): WodInput {
  if (typeof raw !== "object" || raw === null) throw new Error("Données invalides")
  const input = raw as Record<string, unknown>

  const name = typeof input.name === "string" ? input.name.trim() : ""
  if (!name) throw new Error("Donne un nom à ton WOD.")
  if (name.length > WOD_LIMITS.nameMax) throw new Error(`Nom trop long (${WOD_LIMITS.nameMax} caractères max).`)

  const description = typeof input.description === "string" ? input.description.trim() : ""
  if (description.length > WOD_LIMITS.descriptionMax) {
    throw new Error(`Description trop longue (${WOD_LIMITS.descriptionMax} caractères max).`)
  }

  const image =
    typeof input.image === "string" && (WOD_EMOJIS as readonly string[]).includes(input.image) ? input.image : null

  const format = FORMATS.find((f) => f === input.format)
  if (!format) throw new Error("Format invalide.")
  const level = LEVELS.find((l) => l === input.level)
  if (!level) throw new Error("Niveau invalide.")

  if (!Array.isArray(input.steps) || input.steps.length === 0) throw new Error("Ajoute au moins un exercice.")
  if (input.steps.length > WOD_LIMITS.stepsMax) throw new Error(`${WOD_LIMITS.stepsMax} exercices maximum.`)

  const timed = isTimedFormat(format)
  const steps: WodStepInput[] = input.steps.map((rawStep, i) => {
    const step = (typeof rawStep === "object" && rawStep !== null ? rawStep : {}) as Record<string, unknown>
    const label = `Exercice ${i + 1}`
    if (typeof step.cardioExerciseId !== "string" || !step.cardioExerciseId) {
      throw new Error(`${label} : choisis un mouvement.`)
    }
    if (timed) {
      if (!isIntIn(step.durationSec, WOD_LIMITS.stepDurationSec)) {
        throw new Error(`${label} : durée entre ${WOD_LIMITS.stepDurationSec.min} et ${WOD_LIMITS.stepDurationSec.max} s.`)
      }
      return { cardioExerciseId: step.cardioExerciseId, durationSec: step.durationSec, reps: null, distanceM: null }
    }
    if (step.distanceM !== null && step.distanceM !== undefined) {
      if (!isIntIn(step.distanceM, WOD_LIMITS.distanceM)) {
        throw new Error(`${label} : distance entre ${WOD_LIMITS.distanceM.min} et ${WOD_LIMITS.distanceM.max} m.`)
      }
      return { cardioExerciseId: step.cardioExerciseId, durationSec: null, reps: null, distanceM: step.distanceM }
    }
    if (!isIntIn(step.reps, WOD_LIMITS.reps)) {
      throw new Error(`${label} : répétitions entre ${WOD_LIMITS.reps.min} et ${WOD_LIMITS.reps.max}.`)
    }
    return { cardioExerciseId: step.cardioExerciseId, durationSec: null, reps: step.reps, distanceM: null }
  })

  let durationMin: number
  if (format === "CIRCUIT") {
    const totalSec = steps.reduce((sum, s) => sum + (s.durationSec ?? 0), 0)
    durationMin = Math.max(1, Math.ceil(totalSec / 60))
  } else {
    if (!isIntIn(input.durationMin, { min: 1, max: WOD_LIMITS.durationMinMax })) {
      throw new Error(`Durée entre 1 et ${WOD_LIMITS.durationMinMax} min.`)
    }
    durationMin = input.durationMin
  }
  if (format === "EMOM") {
    const minuteSec = steps.reduce((sum, s) => sum + (s.durationSec ?? 0), 0)
    if (minuteSec * durationMin > 6 * 60 * 60) throw new Error("WOD trop long (6 h maximum).")
  }

  return { name, description, image, format, level, durationMin, steps }
}
