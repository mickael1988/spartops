import { prisma } from "@/lib/prisma"
import { computeTargets, withExtraCarbs } from "@/lib/nutrition/calc"
import { cardioActivity, strengthActivity, trainingBonus } from "@/lib/nutrition/activity"
import { addDays, adviseAdjustment, dayToDate, parisDay, trendWindowStart } from "@/lib/nutrition/weight"

const CHART_DAYS = 90

/** Tout ce que la page Nutrition affiche : besoins, séances du jour, poids et ajustement. */
export async function loadNutritionState(userId: string) {
  const today = parisDay()
  const todayDate = dayToDate(today)
  // Fenêtre large autour du jour UTC, puis filtre sur le jour à Paris
  const around = { gte: addDays(todayDate, -1), lt: addDays(todayDate, 2) }

  const [user, weights, workouts, cardio] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { age: true, nutritionProfile: true } }),
    prisma.weightEntry.findMany({
      where: { userId, date: { gte: addDays(todayDate, -CHART_DAYS) } },
      orderBy: { date: "asc" },
      select: { id: true, date: true, weightKg: true },
    }),
    prisma.workout.findMany({
      where: { userId, status: "TERMINEE", isTemplate: false, completedAt: around },
      select: { name: true, startedAt: true, completedAt: true },
    }),
    prisma.userCardioSession.findMany({
      where: { userId, completedAt: around },
      select: { elapsedSeconds: true, completedAt: true, program: { select: { name: true } } },
    }),
  ])

  const profile = user?.nutritionProfile ?? null
  const age = user?.age ?? null
  const latestWeight = weights.at(-1)?.weightKg ?? profile?.weightKg ?? null
  const weightForBurn = latestWeight ?? 75

  const activities = [
    ...workouts
      .filter((w) => w.completedAt && parisDay(w.completedAt) === today)
      .map((w) => strengthActivity(w, weightForBurn)),
    ...cardio.filter((c) => parisDay(c.completedAt) === today).map((c) => cardioActivity(c, weightForBurn)),
  ]
  const bonus = trainingBonus(activities)

  const targets = profile && age ? computeTargets({ ...profile, age }, profile.calorieAdjustment) : null
  const todayTargets = targets ? withExtraCarbs(targets, bonus) : null

  const windowStart = profile ? trendWindowStart(today, profile.adjustedAt) : null
  const advice =
    profile && windowStart
      ? adviseAdjustment(
          profile.goal,
          profile.weightKg,
          weights.filter((w) => w.date >= windowStart),
          profile.calorieAdjustment,
        )
      : null

  return {
    profile,
    age,
    targets,
    todayTargets,
    activities,
    bonus,
    weights,
    latestWeight,
    advice,
  }
}
