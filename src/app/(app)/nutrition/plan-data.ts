import { prisma } from "@/lib/prisma"
import { computeTargets, portionFactor } from "@/lib/nutrition/calc"

/**
 * Plan + facteur de portions de l'utilisateur.
 * Les portions ne sont ajustées que si le plan correspond à l'objectif de l'utilisateur :
 * appliquer les calories d'une prise de masse à un plan de sèche le dénaturerait.
 */
export async function loadPlanForUser(planId: string, userId: string) {
  const [plan, user] = await Promise.all([
    prisma.nutritionPlan.findUnique({
      where: { id: planId },
      include: {
        weeks: {
          orderBy: { weekNumber: "asc" },
          take: 1,
          include: {
            days: { orderBy: { dayNumber: "asc" }, include: { meals: true } },
            groceryItems: { orderBy: [{ category: "asc" }, { name: "asc" }] },
          },
        },
      },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { age: true, nutritionProfile: true } }),
  ])
  if (!plan || plan.weeks.length === 0) return null

  const profile = user?.nutritionProfile ?? null
  const targets = profile && user?.age ? computeTargets({ ...profile, age: user.age }, profile.calorieAdjustment) : null
  const matchesGoal = profile?.goal === plan.goal
  const factor = targets && matchesGoal ? portionFactor(targets.calories, plan.dailyCalories) : 1

  return { plan, week: plan.weeks[0], targets, hasProfile: targets !== null, matchesGoal, factor }
}
