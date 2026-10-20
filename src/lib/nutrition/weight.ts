import type { NutritionGoal } from "./calc"

export const WEIGHT_LIMITS = { min: 35, max: 250 } as const

/** Fenêtre d'analyse de la tendance, et données minimales avant de proposer un ajustement. */
export const TREND_WINDOW_DAYS = 28
export const MIN_TREND_DAYS = 14
export const MIN_TREND_ENTRIES = 4
/** Correction cumulée maximale, pour ne jamais s'éloigner trop du calcul de base. */
export const MAX_ADJUSTMENT = 500

const DAY_MS = 24 * 60 * 60 * 1000
/** ~7 700 kcal par kg de masse corporelle. */
const KCAL_PER_KG = 7700

/** Rythme visé, en % du poids par semaine. */
export const GOAL_RATES: Record<NutritionGoal, { min: number; max: number }> = {
  PRISE_DE_MASSE: { min: 0.25, max: 0.5 },
  SECHE: { min: -1, max: -0.5 },
  MAINTIEN: { min: -0.25, max: 0.25 },
}

/** Jour calendaire à Paris, "YYYY-MM-DD" (les serveurs Vercel tournent en UTC). */
export function parisDay(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" })
}

/** Valeur à stocker dans une colonne @db.Date pour un jour "YYYY-MM-DD". */
export function dayToDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

export function normalizeWeight(raw: unknown): number {
  const weight = typeof raw === "number" ? Math.round(raw * 10) / 10 : NaN
  if (!(weight >= WEIGHT_LIMITS.min && weight <= WEIGHT_LIMITS.max)) {
    throw new Error(`Poids entre ${WEIGHT_LIMITS.min} et ${WEIGHT_LIMITS.max} kg.`)
  }
  return weight
}

/** Jours passés qu'on peut encore saisir après coup. */
export const BACKFILL_DAYS = 90

/** Valide un jour "YYYY-MM-DD" saisi par le client : ni dans le futur, ni trop ancien. */
export function normalizeWeightDay(raw: unknown, today: string = parisDay()): string {
  if (raw === undefined || raw === null || raw === "") return today
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(dayToDate(raw).getTime())) {
    throw new Error("Date invalide.")
  }
  if (raw > today) throw new Error("Impossible d'enregistrer une pesée dans le futur.")
  if (dayToDate(raw) < addDays(dayToDate(today), -BACKFILL_DAYS)) {
    throw new Error(`Pesée trop ancienne (${BACKFILL_DAYS} jours maximum).`)
  }
  return raw
}

export type WeightPoint = { date: Date; weightKg: number }

export type WeightTrend = {
  /** Pente de la régression linéaire, en kg par semaine. */
  kgPerWeek: number
  spanDays: number
  count: number
}

/** Tendance par régression linéaire : lisse les variations d'un jour à l'autre (eau, repas…). */
export function computeTrend(points: WeightPoint[]): WeightTrend | null {
  if (points.length < 2) return null
  const t0 = Math.min(...points.map((p) => p.date.getTime()))
  const xs = points.map((p) => (p.date.getTime() - t0) / DAY_MS)
  const ys = points.map((p) => p.weightKg)
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length
  let num = 0
  let den = 0
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY)
    den += (xs[i] - meanX) ** 2
  }
  if (den === 0) return null
  return { kgPerWeek: (num / den) * 7, spanDays: Math.max(...xs), count: points.length }
}

export type AdjustmentAdvice =
  | { status: "not-enough-data"; daysLeft: number; entriesLeft: number }
  | { status: "on-track"; trend: WeightTrend; range: { min: number; max: number } }
  | { status: "adjust"; trend: WeightTrend; range: { min: number; max: number }; delta: number }
  | { status: "at-limit"; trend: WeightTrend; range: { min: number; max: number } }

/**
 * Compare la tendance réelle au rythme visé et propose une correction de calories.
 * `range` est exprimé en kg/semaine pour l'affichage.
 */
export function adviseAdjustment(
  goal: NutritionGoal,
  weightKg: number,
  points: WeightPoint[],
  currentAdjustment: number,
): AdjustmentAdvice {
  const trend = computeTrend(points)
  const spanDays = trend?.spanDays ?? 0
  if (!trend || spanDays < MIN_TREND_DAYS || points.length < MIN_TREND_ENTRIES) {
    return {
      status: "not-enough-data",
      daysLeft: Math.max(0, Math.ceil(MIN_TREND_DAYS - spanDays)),
      entriesLeft: Math.max(0, MIN_TREND_ENTRIES - points.length),
    }
  }

  const rates = GOAL_RATES[goal]
  const range = { min: (rates.min / 100) * weightKg, max: (rates.max / 100) * weightKg }
  if (trend.kgPerWeek >= range.min && trend.kgPerWeek <= range.max) {
    return { status: "on-track", trend, range }
  }

  // Écart au milieu de la fourchette, converti en kcal/jour, par paliers de 50 et au plus 300 à la fois.
  const target = (range.min + range.max) / 2
  const raw = ((target - trend.kgPerWeek) * KCAL_PER_KG) / 7
  const step = Math.sign(raw) * Math.min(300, Math.max(100, Math.round(Math.abs(raw) / 50) * 50))
  const next = Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, currentAdjustment + step))
  const delta = next - currentAdjustment
  if (delta === 0) return { status: "at-limit", trend, range }
  return { status: "adjust", trend, range, delta }
}

/** Début de la fenêtre d'analyse : on repart de zéro après chaque ajustement. */
export function trendWindowStart(today: string, adjustedAt: Date | null): Date {
  const windowStart = addDays(dayToDate(today), -TREND_WINDOW_DAYS)
  if (!adjustedAt) return windowStart
  const adjustedDay = dayToDate(parisDay(adjustedAt))
  return adjustedDay > windowStart ? adjustedDay : windowStart
}

export function formatKg(kg: number, signed = false): string {
  const rounded = Math.round(kg * 10) / 10
  const text = Math.abs(rounded).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (!signed) return `${text} kg`
  if (rounded === 0) return "0,0 kg"
  return `${rounded > 0 ? "+" : "−"}${text} kg`
}
