import Link from "next/link"
import type { DayActivity } from "@/lib/nutrition/activity"
import type { NutritionTargets } from "@/lib/nutrition/calc"

/** Objectif du jour : base + bonus en glucides si une séance a été faite aujourd'hui. */
export function TodayCard({ targets, activities, bonus }: {
  targets: NutritionTargets
  activities: DayActivity[]
  bonus: number
}) {
  if (activities.length === 0) {
    return (
      <section className="flex items-start gap-3 rounded-2xl border bg-background/80 backdrop-blur-sm p-4">
        <span className="text-2xl" aria-hidden="true">😴</span>
        <div className="space-y-1 text-sm">
          <p className="font-semibold">Aujourd&apos;hui : pas encore de séance</p>
          <p className="text-muted-foreground">
            Termine une <Link href="/musculation" className="text-primary underline-offset-2 hover:underline">séance de muscu</Link> ou
            un <Link href="/cardio" className="text-primary underline-offset-2 hover:underline">WOD</Link> : ton objectif du jour
            augmentera automatiquement pour couvrir l&apos;effort.
          </p>
        </div>
      </section>
    )
  }

  const burned = activities.reduce((sum, a) => sum + a.kcal, 0)
  return (
    <section
      className="space-y-3 rounded-2xl border p-4"
      style={{ background: "linear-gradient(135deg, rgba(63,94,251,0.08), rgba(245,5,53,0.08))" }}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">🔥 Jour d&apos;entraînement</p>
          <p className="text-3xl font-bold tabular-nums">
            {targets.calories.toLocaleString("fr-FR")} <span className="text-base font-semibold">kcal aujourd&apos;hui</span>
          </p>
        </div>
        <span className="rounded-full bg-background/80 px-3 py-1 text-sm font-semibold text-primary tabular-nums">
          +{bonus.toLocaleString("fr-FR")} kcal · +{Math.round(bonus / 4)} g de glucides
        </span>
      </div>
      <ul className="space-y-1 text-sm">
        {activities.map((a, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="truncate">
              {a.kind === "muscu" ? "🏋️" : "⚡"} {a.name} · {a.minutes} min
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">~{a.kcal.toLocaleString("fr-FR")} kcal</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Dépense estimée : ~{burned.toLocaleString("fr-FR")} kcal. Ton niveau d&apos;activité en compte déjà une partie, on
        ajoute donc la moitié, en glucides pour bien récupérer.
      </p>
    </section>
  )
}
