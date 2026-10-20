import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { ACTIVITY_LEVELS, portionFactor, type NutritionTargets } from "@/lib/nutrition/calc"
import { GOAL_LABELS, formatFactor } from "@/lib/nutrition/display"
import { loadNutritionState } from "./nutrition-state"
import { ProfileSection } from "./profile-section"
import { TodayCard } from "./today-card"
import { WeightSection } from "./weight-section"

const GRADIENT = "linear-gradient(to right, #3F5EFB, #F50535)"

function MacroTile({ label, grams, kcalPerGram, total, color }: {
  label: string
  grams: number
  kcalPerGram: number
  total: number
  color: string
}) {
  const percent = total > 0 ? Math.round(((grams * kcalPerGram) / total) * 100) : 0
  return (
    <div className="rounded-xl border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{grams} g</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, background: color }} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{percent} % des calories</p>
    </div>
  )
}

function TargetsCard({ targets, goalLabel, activityLabel, adjustment }: {
  targets: NutritionTargets
  goalLabel: string
  activityLabel: string
  adjustment: number
}) {
  const diff = targets.calories - targets.tdee
  return (
    <section className="space-y-4 rounded-2xl border bg-background/80 backdrop-blur-sm p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">Tes besoins par jour · {goalLabel}</p>
          <p className="text-4xl font-bold tabular-nums">
            {targets.calories.toLocaleString("fr-FR")} <span className="text-lg font-semibold">kcal</span>
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <MacroTile label="Protéines" grams={targets.protein} kcalPerGram={4} total={targets.calories} color="#F50535" />
        <MacroTile label="Glucides" grams={targets.carbs} kcalPerGram={4} total={targets.calories} color="#3F5EFB" />
        <MacroTile label="Lipides" grams={targets.fats} kcalPerGram={9} total={targets.calories} color="#f59e0b" />
      </div>
      <p className="text-xs text-muted-foreground">
        Métabolisme de base : {targets.bmr.toLocaleString("fr-FR")} kcal · Dépense avec ton activité ({activityLabel.toLowerCase()}) :{" "}
        {targets.tdee.toLocaleString("fr-FR")} kcal
        {diff !== 0 && ` · ${diff > 0 ? "+" : "−"}${Math.abs(diff).toLocaleString("fr-FR")} kcal pour ton objectif`}.
        {adjustment !== 0 &&
          ` Dont ${adjustment > 0 ? "+" : "−"}${Math.abs(adjustment).toLocaleString("fr-FR")} kcal d'ajustement d'après l'évolution de ton poids.`}
        {" "}Ce sont des estimations : tes pesées ci-dessous permettent de les affiner.
      </p>
    </section>
  )
}

export default async function NutritionPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [state, plans] = await Promise.all([
    loadNutritionState(session.user.id),
    prisma.nutritionPlan.findMany({
      orderBy: { dailyCalories: "desc" },
      select: { id: true, name: true, description: true, goal: true, dailyCalories: true, dailyProtein: true, dailyCarbs: true, dailyFats: true },
    }),
  ])

  const { profile, age, targets, todayTargets } = state
  const recommended = profile ? plans.find((p) => p.goal === profile.goal) : undefined
  const ordered = recommended ? [recommended, ...plans.filter((p) => p.id !== recommended.id)] : plans

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nutrition</h1>
        <p className="text-muted-foreground mt-1">Tes besoins au quotidien et des semaines types pour les atteindre.</p>
      </div>

      <ProfileSection
        hasProfile={targets !== null}
        initial={profile ? { ...profile, age: age ?? undefined } : { age: age ?? undefined }}
      >
        {targets && profile && (
          <TargetsCard
            targets={targets}
            goalLabel={GOAL_LABELS[profile.goal].label}
            activityLabel={ACTIVITY_LEVELS.find((a) => a.value === profile.activityLevel)?.label ?? ""}
            adjustment={profile.calorieAdjustment}
          />
        )}
      </ProfileSection>

      {todayTargets && <TodayCard targets={todayTargets} activities={state.activities} bonus={state.bonus} />}

      <WeightSection
        weights={state.weights}
        latestWeight={state.latestWeight}
        advice={state.advice}
        goal={profile?.goal ?? null}
        adjustment={profile?.calorieAdjustment ?? 0}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Plans types</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ordered.map((plan) => {
            const isRecommended = plan.id === recommended?.id
            const factor = targets ? portionFactor(targets.calories, plan.dailyCalories) : null
            return (
              <Link
                key={plan.id}
                href={`/nutrition/plan/${plan.id}`}
                className="relative flex flex-col gap-2 rounded-2xl border bg-background/80 backdrop-blur-sm p-4 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                style={isRecommended ? { borderColor: "transparent", boxShadow: "0 0 0 2px #3F5EFB" } : undefined}
              >
                {isRecommended && (
                  <span
                    className="absolute -top-2.5 left-4 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                    style={{ background: GRADIENT }}
                  >
                    Recommandé pour toi
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden="true">{GOAL_LABELS[plan.goal].emoji}</span>
                  <h3 className="font-semibold">{plan.name}</h3>
                </div>
                <p className="flex-1 text-sm text-muted-foreground">{plan.description}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  ~{plan.dailyCalories.toLocaleString("fr-FR")} kcal · P {plan.dailyProtein} g · G {plan.dailyCarbs} g · L {plan.dailyFats} g
                </p>
                {factor !== null && isRecommended && (
                  <p className="text-xs font-medium text-primary">Portions ajustées pour toi : {formatFactor(factor)}</p>
                )}
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Voir la semaine <ChevronRight className="size-4" aria-hidden="true" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
