"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { NumberStepper } from "@/components/ui/number-stepper"
import { cn } from "@/lib/utils"
import {
  ACTIVITY_LEVELS,
  GOALS,
  PROFILE_LIMITS,
  type ActivityLevel,
  type NutritionGoal,
  type NutritionProfileInput,
  type Sex,
} from "@/lib/nutrition/calc"
import { saveNutritionProfile } from "./actions"

const GRADIENT = "linear-gradient(to right, #3F5EFB, #F50535)"

export type ProfileFormInitial = Partial<NutritionProfileInput>

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "text-white border-transparent font-semibold shadow-sm"
          : "bg-muted/40 text-foreground/70 border-border hover:border-primary hover:text-primary",
      )}
      style={active ? { background: GRADIENT } : undefined}
    >
      {children}
    </button>
  )
}

export function ProfileForm({ initial, onSaved }: { initial: ProfileFormInitial; onSaved?: () => void }) {
  const router = useRouter()
  const [sex, setSex] = useState<Sex | null>(initial.sex ?? null)
  const [age, setAge] = useState<number | null>(initial.age ?? 30)
  const [heightCm, setHeightCm] = useState<number | null>(initial.heightCm ?? 175)
  const [weightKg, setWeightKg] = useState<number | null>(initial.weightKg ?? 75)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(initial.activityLevel ?? "MODERE")
  const [goal, setGoal] = useState<NutritionGoal>(initial.goal ?? "MAINTIEN")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  const activity = ACTIVITY_LEVELS.find((a) => a.value === activityLevel)
  const goalInfo = GOALS.find((g) => g.value === goal)

  function submit() {
    setError("")
    startTransition(async () => {
      const result = await saveNutritionProfile({ sex, age, heightCm, weightKg, activityLevel, goal })
      if (!result.ok) {
        setError(result.error)
        return
      }
      onSaved?.()
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium">Sexe</p>
        <div className="flex gap-2">
          <Pill active={sex === "HOMME"} onClick={() => setSex("HOMME")}>Homme</Pill>
          <Pill active={sex === "FEMME"} onClick={() => setSex("FEMME")}>Femme</Pill>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <NumberStepper
          label="Âge"
          unit="ans"
          min={PROFILE_LIMITS.age.min}
          max={PROFILE_LIMITS.age.max}
          value={age}
          onChange={setAge}
        />
        <NumberStepper
          label="Taille"
          unit="cm"
          min={PROFILE_LIMITS.heightCm.min}
          max={PROFILE_LIMITS.heightCm.max}
          value={heightCm}
          onChange={setHeightCm}
        />
        <NumberStepper
          label="Poids"
          unit="kg"
          min={PROFILE_LIMITS.weightKg.min}
          max={PROFILE_LIMITS.weightKg.max}
          step={0.5}
          value={weightKg}
          onChange={setWeightKg}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Activité</p>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_LEVELS.map((a) => (
            <Pill key={a.value} active={activityLevel === a.value} onClick={() => setActivityLevel(a.value)}>
              {a.label}
            </Pill>
          ))}
        </div>
        {activity && <p className="text-xs text-muted-foreground">{activity.hint}</p>}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Objectif</p>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <Pill key={g.value} active={goal === g.value} onClick={() => setGoal(g.value)}>
              {g.label}
            </Pill>
          ))}
        </div>
        {goalInfo && <p className="text-xs text-muted-foreground">{goalInfo.hint}</p>}
      </div>

      {error && (
        <p role="alert" className="text-center text-sm text-red-500">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="w-full rounded-2xl py-3.5 text-base font-bold text-white disabled:opacity-60"
        style={{ background: GRADIENT }}
      >
        {pending ? "Calcul…" : "Calculer mes besoins"}
      </button>
    </div>
  )
}
