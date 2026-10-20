"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { NumberStepper } from "@/components/ui/number-stepper"
import { WEIGHT_LIMITS } from "@/lib/nutrition/weight"
import { applyCalorieAdjustment, deleteWeight, logWeight } from "./actions"

const GRADIENT = "linear-gradient(to right, #3F5EFB, #F50535)"

function useAction() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, onDone?: () => void) {
    setError("")
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.error)
        return
      }
      onDone?.()
      router.refresh()
    })
  }

  return { error, pending, run }
}

export function WeightLogger({ initial, today, minDay, logged }: {
  initial: number | null
  today: string
  minDay: string
  /** Pesées déjà saisies, par jour "YYYY-MM-DD". */
  logged: Record<string, number>
}) {
  const [weight, setWeight] = useState<number | null>(initial ?? 75)
  const [day, setDay] = useState(today)
  const [saved, setSaved] = useState(false)
  const { error, pending, run } = useAction()
  const exists = day in logged
  const isToday = day === today

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="weight-day" className="text-sm text-muted-foreground">
          Date
        </label>
        <input
          id="weight-day"
          type="date"
          value={day}
          min={minDay}
          max={today}
          onChange={(e) => {
            const next = e.target.value || today
            setDay(next)
            setSaved(false)
            // On repart de la pesée déjà saisie ce jour-là, s'il y en a une
            if (next in logged) setWeight(logged[next])
          }}
          className="h-11 rounded-xl border bg-background px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <NumberStepper
          label={isToday ? "Pesée du jour" : "Poids"}
          unit="kg"
          min={WEIGHT_LIMITS.min}
          max={WEIGHT_LIMITS.max}
          step={0.1}
          value={weight}
          onChange={(value) => {
            setWeight(value)
            setSaved(false)
          }}
          className="sm:flex-1"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => logWeight(weight, day), () => setSaved(true))}
          className="h-11 shrink-0 rounded-xl px-5 text-sm font-bold text-white disabled:opacity-60"
          style={{ background: GRADIENT }}
        >
          {pending ? "…" : exists ? "Mettre à jour" : "Enregistrer"}
        </button>
      </div>
      {saved && !error ? (
        <p className="text-xs text-emerald-600">✓ Pesée enregistrée, tes besoins sont recalculés.</p>
      ) : (
        exists && (
          <p className="text-xs text-muted-foreground">
            Une pesée existe déjà {isToday ? "aujourd'hui" : "ce jour-là"} : elle sera remplacée (une seule pesée par jour).
          </p>
        )
      )}
      {error && (
        <p role="alert" className="text-xs text-red-500">
          {error}
        </p>
      )}
      <p className="text-[11px] text-muted-foreground">
        Astuce : pèse-toi le matin, à jeun, après être passé aux toilettes, pour comparer ce qui est comparable. Un jour
        oublié ? Change la date pour l&apos;ajouter après coup.
      </p>
    </div>
  )
}

export function DeleteWeightButton({ id, label }: { id: string; label: string }) {
  const [confirming, setConfirming] = useState(false)
  const { error, pending, run } = useAction()

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => deleteWeight(id))}
          className="font-semibold text-red-500 disabled:opacity-60"
        >
          {pending ? "…" : "Supprimer"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-muted-foreground">
          Annuler
        </button>
        {error && <span className="text-red-500">{error}</span>}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={`Supprimer la pesée du ${label}`}
      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-red-500"
    >
      <Trash2 className="size-3.5" aria-hidden="true" />
    </button>
  )
}

export function ApplyAdjustmentButton({ label }: { label: string }) {
  const { error, pending, run } = useAction()

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => applyCalorieAdjustment())}
        className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        style={{ background: GRADIENT }}
      >
        {pending ? "Application…" : label}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}
