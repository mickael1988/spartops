import { formatDate } from "@/lib/cardio/format"
import type { NutritionGoal } from "@/lib/nutrition/calc"
import { GOAL_LABELS } from "@/lib/nutrition/display"
import {
  addDays,
  BACKFILL_DAYS,
  dayToDate,
  formatKg,
  MIN_TREND_DAYS,
  MIN_TREND_ENTRIES,
  parisDay,
  type AdjustmentAdvice,
} from "@/lib/nutrition/weight"
import { WeightChart } from "./weight-chart"
import { ApplyAdjustmentButton, DeleteWeightButton, WeightLogger } from "./weight-controls"

const RECENT_COUNT = 7

function formatKcal(kcal: number) {
  return `${kcal > 0 ? "+" : "−"}${Math.abs(kcal).toLocaleString("fr-FR")} kcal`
}

function formatRange(range: { min: number; max: number }) {
  return `${formatKg(range.min, true)} et ${formatKg(range.max, true)} par semaine`
}

function AdviceCard({ advice, goal, adjustment }: { advice: AdjustmentAdvice; goal: NutritionGoal; adjustment: number }) {
  const goalLabel = GOAL_LABELS[goal].label.toLowerCase()

  if (advice.status === "not-enough-data") {
    const parts = [
      advice.entriesLeft > 0 && `encore ${advice.entriesLeft} pesée${advice.entriesLeft > 1 ? "s" : ""}`,
      advice.daysLeft > 0 && `${advice.daysLeft} jour${advice.daysLeft > 1 ? "s" : ""} de recul`,
    ].filter(Boolean)
    return (
      <div className="rounded-xl border border-dashed p-3 text-sm">
        <p className="font-medium">🧭 Objectifs auto-ajustés</p>
        <p className="mt-1 text-muted-foreground">
          Pèse-toi au moins {MIN_TREND_ENTRIES} fois sur {MIN_TREND_DAYS} jours : je comparerai ta tendance au rythme
          idéal pour ta {goalLabel} et j&apos;ajusterai tes calories si besoin.
          {parts.length > 0 && ` Il te manque ${parts.join(" et ")}.`}
        </p>
      </div>
    )
  }

  const trendText = `Ta tendance : ${formatKg(advice.trend.kgPerWeek, true)} par semaine (sur ${Math.round(advice.trend.spanDays)} jours).`
  const rangeText = `Pour ta ${goalLabel}, l'idéal est entre ${formatRange(advice.range)}.`

  if (advice.status === "on-track") {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm">
        <p className="font-medium">✅ Tu es dans le bon rythme</p>
        <p className="mt-1 text-muted-foreground">
          {trendText} {rangeText} On garde tes objectifs.
        </p>
      </div>
    )
  }

  if (advice.status === "at-limit") {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
        <p className="font-medium">⚠️ Ajustement maximal atteint</p>
        <p className="mt-1 text-muted-foreground">
          {trendText} {rangeText} Tes calories sont déjà corrigées de {formatKcal(adjustment)} : vérifie ton niveau
          d&apos;activité dans tes infos, ou la régularité de tes repas.
        </p>
      </div>
    )
  }

  const tooSlow = advice.delta > 0 === (goal !== "SECHE")
  return (
    <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
      <div>
        <p className="font-medium">
          {goal === "MAINTIEN" ? "📉 Ton poids bouge un peu trop" : tooSlow ? "🐢 Ça avance trop lentement" : "🚀 Ça va un peu trop vite"}
        </p>
        <p className="mt-1 text-muted-foreground">
          {trendText} {rangeText} Je te propose <strong className="text-foreground">{formatKcal(advice.delta)} par jour</strong>.
        </p>
      </div>
      <ApplyAdjustmentButton label={`Appliquer ${formatKcal(advice.delta)}`} />
    </div>
  )
}

export function WeightSection({ weights, latestWeight, advice, goal, adjustment }: {
  weights: { id: string; date: Date; weightKg: number }[]
  latestWeight: number | null
  advice: AdjustmentAdvice | null
  goal: NutritionGoal | null
  adjustment: number
}) {
  const first = weights[0]
  const last = weights.at(-1)
  const recent = weights.slice(-RECENT_COUNT).reverse()
  const today = parisDay()
  // Les dates @db.Date arrivent à minuit UTC : toISOString donne directement le jour
  const logged = Object.fromEntries(weights.map((w) => [w.date.toISOString().slice(0, 10), w.weightKg]))
  const dateLabel = (date: Date) => formatDate(date, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })

  return (
    <section className="space-y-4 rounded-2xl border bg-background/80 backdrop-blur-sm p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Mon poids</h2>
          {last && first && weights.length > 1 ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{formatKg(last.weightKg)}</span> ·{" "}
              {formatKg(last.weightKg - first.weightKg, true)} depuis le {formatDate(first.date, { day: "numeric", month: "long", timeZone: "UTC" })}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Note ton poids régulièrement pour suivre ta progression.</p>
          )}
        </div>
      </div>

      <WeightLogger
        initial={latestWeight}
        today={today}
        minDay={addDays(dayToDate(today), -BACKFILL_DAYS).toISOString().slice(0, 10)}
        logged={logged}
      />

      {weights.length >= 2 ? (
        <WeightChart points={weights} />
      ) : (
        <div className="flex h-28 items-center justify-center rounded-xl border border-dashed px-4 text-center text-sm text-muted-foreground">
          {weights.length === 0
            ? "Ta courbe de poids apparaîtra ici dès tes premières pesées."
            : "Encore une pesée un autre jour, et ta courbe apparaîtra ici."}
        </div>
      )}

      {advice && goal && <AdviceCard advice={advice} goal={goal} adjustment={adjustment} />}

      {recent.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-primary">Dernières pesées</summary>
          <ul className="mt-2 divide-y">
            {recent.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="capitalize text-muted-foreground">{dateLabel(entry.date)}</span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">{formatKg(entry.weightKg)}</span>
                  <DeleteWeightButton id={entry.id} label={dateLabel(entry.date)} />
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
