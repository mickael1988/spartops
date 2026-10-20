import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronRight, ShoppingCart } from "lucide-react"
import { getSession } from "@/lib/session"
import { cn } from "@/lib/utils"
import { GOAL_LABELS, MEAL_TYPES, formatFactor, scaleDescription } from "@/lib/nutrition/display"
import { loadPlanForUser } from "../../plan-data"

const GRADIENT = "linear-gradient(to right, #3F5EFB, #F50535)"
const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

function round1(n: number) {
  return Math.round(n * 10) / 10
}

export default async function NutritionPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ jour?: string }>
}) {
  const [{ id }, { jour }] = await Promise.all([params, searchParams])
  const session = await getSession()
  if (!session) redirect("/login")

  const data = await loadPlanForUser(id, session.user.id)
  if (!data) notFound()
  const { plan, week, targets, hasProfile, matchesGoal, factor } = data

  const dayNumber = Math.min(Math.max(Number.parseInt(jour ?? "1", 10) || 1, 1), week.days.length)
  const day = week.days.find((d) => d.dayNumber === dayNumber) ?? week.days[0]
  const meals = [...day.meals]
    .sort((a, b) => MEAL_TYPES[a.type].order - MEAL_TYPES[b.type].order)
    .map((m) => ({
      ...m,
      description: m.description ? scaleDescription(m.description, factor) : null,
      calories: Math.round(m.calories * factor),
      protein: round1(m.protein * factor),
      carbs: round1(m.carbs * factor),
      fats: round1(m.fats * factor),
    }))
  const total = meals.reduce(
    (t, m) => ({ calories: t.calories + m.calories, protein: t.protein + m.protein, carbs: t.carbs + m.carbs, fats: t.fats + m.fats }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  )

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/nutrition" className="hover:text-foreground transition-colors">Nutrition</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium" aria-current="page">{plan.name}</span>
      </nav>

      <div>
        <div className="flex items-center gap-3">
          <span className="text-4xl" aria-hidden="true">{GOAL_LABELS[plan.goal].emoji}</span>
          <h1 className="text-3xl font-bold">{plan.name}</h1>
        </div>
        <p className="text-muted-foreground mt-1">{plan.description}</p>
      </div>

      {factor !== 1 && targets ? (
        <p className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          Quantités ajustées à tes {targets.calories.toLocaleString("fr-FR")} kcal par jour ({formatFactor(factor)} par rapport au plan de base).
        </p>
      ) : !hasProfile ? (
        <p className="rounded-2xl border bg-muted/40 px-4 py-3 text-sm">
          Quantités du plan de base (~{plan.dailyCalories.toLocaleString("fr-FR")} kcal).{" "}
          <Link href="/nutrition" className="font-medium text-primary hover:underline">Calcule tes besoins</Link> pour les ajuster à toi.
        </p>
      ) : !matchesGoal ? (
        <p className="rounded-2xl border bg-muted/40 px-4 py-3 text-sm">
          Ce plan ne correspond pas à ton objectif : quantités du plan de base (~{plan.dailyCalories.toLocaleString("fr-FR")} kcal).
        </p>
      ) : null}

      <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
        {week.days.map((d) => {
          const active = d.dayNumber === day.dayNumber
          return (
            <Link
              key={d.id}
              href={`/nutrition/plan/${plan.id}?jour=${d.dayNumber}`}
              scroll={false}
              aria-current={active ? "true" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "text-white border-transparent font-semibold shadow-sm"
                  : "bg-muted/40 text-foreground/70 border-border hover:border-primary hover:text-primary",
              )}
              style={active ? { background: GRADIENT } : undefined}
            >
              <span className="sm:hidden">{DAY_LABELS[d.dayNumber - 1]?.slice(0, 3) ?? `J${d.dayNumber}`}</span>
              <span className="hidden sm:inline">{DAY_LABELS[d.dayNumber - 1] ?? `Jour ${d.dayNumber}`}</span>
            </Link>
          )
        })}
      </div>

      <div className="space-y-3">
        {meals.map((meal) => (
          <div key={meal.id} className="space-y-1.5 rounded-2xl border bg-background/80 backdrop-blur-sm p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span aria-hidden="true">{MEAL_TYPES[meal.type].emoji}</span> {MEAL_TYPES[meal.type].label}
              </p>
              <p className="shrink-0 text-sm font-semibold tabular-nums">{meal.calories} kcal</p>
            </div>
            <p className="font-semibold">{meal.name}</p>
            {meal.description && <p className="text-sm text-muted-foreground">{meal.description}</p>}
            <p className="text-xs text-muted-foreground tabular-nums">
              P {Math.round(meal.protein)} g · G {Math.round(meal.carbs)} g · L {Math.round(meal.fats)} g
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-background/80 backdrop-blur-sm p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-semibold">Total du jour</p>
          <p className="font-bold tabular-nums">{total.calories.toLocaleString("fr-FR")} kcal</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          P {Math.round(total.protein)} g · G {Math.round(total.carbs)} g · L {Math.round(total.fats)} g
          {targets && matchesGoal && ` (objectif : P ${targets.protein} g · G ${targets.carbs} g · L ${targets.fats} g)`}
        </p>
      </div>

      <Link
        href={`/nutrition/plan/${plan.id}/courses`}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-lg font-bold text-white"
        style={{ background: GRADIENT }}
      >
        <ShoppingCart className="size-5" aria-hidden="true" />
        Liste de courses de la semaine
      </Link>
    </div>
  )
}
