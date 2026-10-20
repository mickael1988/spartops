import type { NutritionGoal } from "./calc"

export type MealTypeKey = "PETIT_DEJEUNER" | "DEJEUNER" | "COLLATION" | "DINER"

export const MEAL_TYPES: Record<MealTypeKey, { label: string; emoji: string; order: number }> = {
  PETIT_DEJEUNER: { label: "Petit-déjeuner", emoji: "🥣", order: 0 },
  DEJEUNER: { label: "Déjeuner", emoji: "🍽️", order: 1 },
  COLLATION: { label: "Collation", emoji: "🍎", order: 2 },
  DINER: { label: "Dîner", emoji: "🌙", order: 3 },
}

export const GOAL_LABELS: Record<NutritionGoal, { label: string; emoji: string }> = {
  PRISE_DE_MASSE: { label: "Prise de masse", emoji: "💪" },
  SECHE: { label: "Sèche", emoji: "🔥" },
  MAINTIEN: { label: "Maintien", emoji: "⚖️" },
}

function roundTo5(n: number) {
  return Math.max(5, Math.round(n / 5) * 5)
}

/**
 * Ajuste les quantités d'une description de repas générée par le seed
 * ("150 g de poulet · 2 œufs · 250 ml de lait") selon un facteur de portions.
 */
export function scaleDescription(description: string, factor: number): string {
  if (factor === 1) return description
  return description
    .split(" · ")
    .map((part) => {
      const weighed = part.match(/^(\d+) (g|ml) (.*)$/)
      if (weighed) return `${roundTo5(Number(weighed[1]) * factor)} ${weighed[2]} ${weighed[3]}`
      const counted = part.match(/^(\d+) (\S+?)s? (.*)$|^(\d+) (\S+?)s?$/)
      if (counted) {
        const n = Number(counted[1] ?? counted[4])
        const word = counted[2] ?? counted[5]
        const rest = counted[3] ? ` ${counted[3]}` : ""
        const scaled = Math.max(1, Math.round(n * factor))
        return `${scaled} ${word}${scaled > 1 ? "s" : ""}${rest}`
      }
      return part
    })
    .join(" · ")
}

/** Quantité de la liste de courses, ajustée et lisible (kg / L au-delà de 1000). */
export function formatQuantity(quantity: number, unit: string, factor: number): string {
  if (unit === "pièce") {
    const n = Math.max(1, Math.ceil(quantity * factor))
    return `${n}`
  }
  const scaled = roundTo5(quantity * factor)
  if (scaled >= 1000) {
    const big = (Math.round(scaled / 100) / 10).toLocaleString("fr-FR")
    return `${big} ${unit === "ml" ? "L" : "kg"}`
  }
  return `${scaled} ${unit}`
}

export function formatFactor(factor: number): string {
  return `×${factor.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
