export type Sex = "HOMME" | "FEMME"
export type ActivityLevel = "SEDENTAIRE" | "LEGER" | "MODERE" | "ACTIF" | "TRES_ACTIF"
export type NutritionGoal = "PRISE_DE_MASSE" | "SECHE" | "MAINTIEN"

export type NutritionProfileInput = {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activityLevel: ActivityLevel
  goal: NutritionGoal
}

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; hint: string; factor: number }[] = [
  { value: "SEDENTAIRE", label: "Sédentaire", hint: "Travail assis, peu ou pas de sport", factor: 1.2 },
  { value: "LEGER", label: "Léger", hint: "1 à 2 séances par semaine", factor: 1.375 },
  { value: "MODERE", label: "Modéré", hint: "3 à 4 séances par semaine", factor: 1.55 },
  { value: "ACTIF", label: "Actif", hint: "5 à 6 séances par semaine", factor: 1.725 },
  { value: "TRES_ACTIF", label: "Très actif", hint: "Sport quotidien ou métier physique", factor: 1.9 },
]

export const GOALS: { value: NutritionGoal; label: string; hint: string }[] = [
  { value: "PRISE_DE_MASSE", label: "Prise de masse", hint: "Léger surplus (+10 %) pour construire du muscle" },
  { value: "SECHE", label: "Sèche", hint: "Déficit (−20 %) en gardant beaucoup de protéines" },
  { value: "MAINTIEN", label: "Maintien", hint: "Rester au même poids" },
]

export const PROFILE_LIMITS = {
  age: { min: 14, max: 100 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 35, max: 250 },
} as const

const GOAL_FACTOR: Record<NutritionGoal, number> = { PRISE_DE_MASSE: 1.1, SECHE: 0.8, MAINTIEN: 1 }
const PROTEIN_PER_KG: Record<NutritionGoal, number> = { PRISE_DE_MASSE: 1.8, SECHE: 2.2, MAINTIEN: 1.6 }
const FAT_PER_KG: Record<NutritionGoal, number> = { PRISE_DE_MASSE: 1, SECHE: 0.8, MAINTIEN: 0.9 }

export type NutritionTargets = {
  bmr: number
  tdee: number
  calories: number
  protein: number
  carbs: number
  fats: number
}

/**
 * Métabolisme de base (Mifflin-St Jeor), dépense quotidienne et répartition des macros.
 * `calorieAdjustment` : correction acceptée d'après l'évolution du poids (voir weight.ts).
 */
export function computeTargets(p: NutritionProfileInput, calorieAdjustment = 0): NutritionTargets {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "HOMME" ? 5 : -161)
  const factor = ACTIVITY_LEVELS.find((a) => a.value === p.activityLevel)?.factor ?? 1.2
  const tdee = bmr * factor
  // On ne descend jamais sous le métabolisme de base.
  const calories = Math.round(Math.max(tdee * GOAL_FACTOR[p.goal] + calorieAdjustment, bmr) / 10) * 10

  const protein = Math.round(p.weightKg * PROTEIN_PER_KG[p.goal])
  // Lipides : au moins 20 % des calories.
  const fats = Math.round(Math.max(p.weightKg * FAT_PER_KG[p.goal], (calories * 0.2) / 9))
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fats * 9) / 4))

  return { bmr: Math.round(bmr), tdee: Math.round(tdee), calories, protein, carbs, fats }
}

function isIntIn(value: unknown, range: { min: number; max: number }): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= range.min && value <= range.max
}

/** Valide une saisie venant du client. Lève une Error au message affichable. */
export function normalizeProfileInput(raw: unknown): NutritionProfileInput {
  if (typeof raw !== "object" || raw === null) throw new Error("Données invalides")
  const input = raw as Record<string, unknown>

  const sex = input.sex === "HOMME" || input.sex === "FEMME" ? input.sex : null
  if (!sex) throw new Error("Indique ton sexe.")
  if (!isIntIn(input.age, PROFILE_LIMITS.age)) {
    throw new Error(`Âge entre ${PROFILE_LIMITS.age.min} et ${PROFILE_LIMITS.age.max} ans.`)
  }
  if (!isIntIn(input.heightCm, PROFILE_LIMITS.heightCm)) {
    throw new Error(`Taille entre ${PROFILE_LIMITS.heightCm.min} et ${PROFILE_LIMITS.heightCm.max} cm.`)
  }
  const weightKg = typeof input.weightKg === "number" ? Math.round(input.weightKg * 10) / 10 : NaN
  if (!(weightKg >= PROFILE_LIMITS.weightKg.min && weightKg <= PROFILE_LIMITS.weightKg.max)) {
    throw new Error(`Poids entre ${PROFILE_LIMITS.weightKg.min} et ${PROFILE_LIMITS.weightKg.max} kg.`)
  }
  const activityLevel = ACTIVITY_LEVELS.find((a) => a.value === input.activityLevel)?.value
  if (!activityLevel) throw new Error("Choisis ton niveau d'activité.")
  const goal = GOALS.find((g) => g.value === input.goal)?.value
  if (!goal) throw new Error("Choisis ton objectif.")

  return { sex, age: input.age, heightCm: input.heightCm, weightKg, activityLevel, goal }
}

/** Calories supplémentaires d'un jour d'entraînement, apportées en glucides. */
export function withExtraCarbs(targets: NutritionTargets, kcal: number): NutritionTargets {
  if (kcal <= 0) return targets
  return { ...targets, calories: targets.calories + kcal, carbs: targets.carbs + Math.round(kcal / 4) }
}

/** Facteur d'ajustement des portions d'un plan type pour atteindre l'objectif calorique. */
export function portionFactor(targetCalories: number, planCalories: number): number {
  if (planCalories <= 0) return 1
  return Math.round((targetCalories / planCalories) * 100) / 100
}
