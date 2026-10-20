"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, PlusCircle, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NumberStepper } from "@/components/ui/number-stepper"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { WodFormat } from "@/lib/cardio/timeline"
import { WOD_EMOJIS, WOD_LIMITS, isTimedFormat, type WodInput, type WodLevel } from "@/lib/cardio/wod-input"
import { formatClock } from "@/lib/cardio/format"
import { createWod, updateWod } from "./actions"
import { FORMAT_CONFIG } from "./format-badge"
import { LEVEL_CONFIG } from "./wod-meta"

const GRADIENT = "linear-gradient(to right, #3F5EFB, #F50535)"

export type ExerciseOption = { id: string; name: string; image: string | null; equipment: string | null }

type StepDraft = {
  key: string
  cardioExerciseId: string
  durationSec: number
  reps: number
  distanceM: number
  unit: "reps" | "distance"
}

export type WodFormInitial = {
  id: string
  name: string
  description: string
  image: string | null
  format: WodFormat
  level: WodLevel
  durationMin: number
  steps: { cardioExerciseId: string; durationSec: number | null; reps: number | null; distanceM: number | null }[]
}

const FORMATS: WodFormat[] = ["CIRCUIT", "AMRAP", "EMOM", "FOR_TIME"]
const LEVELS: { value: WodLevel; label: string }[] = [
  { value: "DEBUTANT", label: "Débutant" },
  { value: "INTERMEDIAIRE", label: "Intermédiaire" },
  { value: "AVANCE", label: "Avancé" },
]

const DURATION_FIELD: Record<Exclude<WodFormat, "CIRCUIT">, { label: string; hint: string }> = {
  AMRAP: { label: "Temps limite", hint: "Le plus de tours possible dans ce temps." },
  EMOM: { label: "Nombre de minutes", hint: "Les exercices ci-dessous sont répétés chaque minute." },
  FOR_TIME: { label: "Temps indicatif", hint: "Pour info : le chrono tourne jusqu'à ce que tu aies fini." },
}

function newKey() {
  return Math.random().toString(36).slice(2, 10)
}

function toDraft(step: WodFormInitial["steps"][number]): StepDraft {
  return {
    key: newKey(),
    cardioExerciseId: step.cardioExerciseId,
    durationSec: step.durationSec ?? 30,
    reps: step.reps ?? 10,
    distanceM: step.distanceM ?? 200,
    unit: step.distanceM !== null ? "distance" : "reps",
  }
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
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

export function WodForm({ exercises, initial }: { exercises: ExerciseOption[]; initial?: WodFormInitial }) {
  const router = useRouter()
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [image, setImage] = useState<string | null>(initial?.image ?? WOD_EMOJIS[0])
  const [format, setFormat] = useState<WodFormat>(initial?.format ?? "CIRCUIT")
  const [level, setLevel] = useState<WodLevel>(initial?.level ?? "INTERMEDIAIRE")
  const [durationMin, setDurationMin] = useState(initial?.durationMin ?? 10)
  const [steps, setSteps] = useState<StepDraft[]>(initial ? initial.steps.map(toDraft) : [])
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  const timed = isTimedFormat(format)
  const exerciseById = new Map(exercises.map((e) => [e.id, e]))
  const stepsTotalSec = steps.reduce((sum, s) => sum + s.durationSec, 0)

  function updateStep(key: string, patch: Partial<StepDraft>) {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  }

  function moveStep(index: number, delta: -1 | 1) {
    setSteps((prev) => {
      const target = index + delta
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { key: newKey(), cardioExerciseId: "", durationSec: 30, reps: 10, distanceM: 200, unit: "reps" },
    ])
  }

  function submit() {
    setError("")
    const payload: WodInput = {
      name,
      description,
      image,
      format,
      level,
      durationMin,
      steps: steps.map((s) => ({
        cardioExerciseId: s.cardioExerciseId,
        durationSec: timed ? s.durationSec : null,
        reps: !timed && s.unit === "reps" ? s.reps : null,
        distanceM: !timed && s.unit === "distance" ? s.distanceM : null,
      })),
    }
    startTransition(async () => {
      const result = initial ? await updateWod(initial.id, payload) : await createWod(payload)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push(`/cardio/${result.id}`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Identité */}
      <section className="space-y-4 rounded-2xl border bg-background/80 backdrop-blur-sm p-4 sm:p-5">
        <div className="space-y-2">
          <Label htmlFor="wod-name">Nom</Label>
          <Input
            id="wod-name"
            value={name}
            maxLength={WOD_LIMITS.nameMax}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Mon circuit du mardi"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wod-description">Description (optionnel)</Label>
          <textarea
            id="wod-description"
            value={description}
            maxLength={WOD_LIMITS.descriptionMax}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder="Ce que tu veux travailler, les consignes…"
          />
        </div>
        <div className="space-y-2">
          <Label>Icône</Label>
          <div className="flex flex-wrap gap-2">
            {WOD_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setImage(emoji)}
                aria-pressed={image === emoji}
                aria-label={`Icône ${emoji}`}
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl border text-xl transition-colors",
                  image === emoji ? "border-primary bg-primary/10" : "border-border hover:border-primary",
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Format, niveau, durée */}
      <section className="space-y-4 rounded-2xl border bg-background/80 backdrop-blur-sm p-4 sm:p-5">
        <div className="space-y-2">
          <Label>Format</Label>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => {
              const Icon = FORMAT_CONFIG[f].icon
              return (
                <Pill key={f} active={format === f} onClick={() => setFormat(f)}>
                  <Icon className="size-3.5" aria-hidden="true" />
                  {FORMAT_CONFIG[f].label}
                </Pill>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {FORMAT_CONFIG[format].hint}
            {timed ? " — chaque exercice dure un temps donné." : " — chaque exercice a un nombre de reps ou une distance."}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Niveau</Label>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => {
              const Icon = LEVEL_CONFIG[l.value].icon
              return (
                <Pill key={l.value} active={level === l.value} onClick={() => setLevel(l.value)}>
                  <Icon className="size-3.5" aria-hidden="true" />
                  {l.label}
                </Pill>
              )
            })}
          </div>
        </div>

        {format === "CIRCUIT" ? (
          <p className="text-sm text-muted-foreground">
            Durée totale : <span className="font-semibold text-foreground">{formatClock(stepsTotalSec * 1000, "up")}</span>{" "}
            (somme des exercices)
          </p>
        ) : (
          <div className="space-y-1">
            <NumberStepper
              label={DURATION_FIELD[format].label}
              unit="min"
              min={1}
              max={WOD_LIMITS.durationMinMax}
              value={durationMin}
              onChange={(v) => setDurationMin(v ?? 1)}
            />
            <p className="text-xs text-muted-foreground">{DURATION_FIELD[format].hint}</p>
          </div>
        )}
      </section>

      {/* Exercices */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {format === "EMOM" ? "Chaque minute" : format === "AMRAP" ? "Un tour" : "Exercices"}
          </h2>
          {format === "EMOM" && steps.length > 0 && (
            <span className={cn("text-xs", stepsTotalSec === 60 ? "text-muted-foreground" : "text-amber-600")}>
              Total : {stepsTotalSec} s{stepsTotalSec !== 60 && " (une minute = 60 s)"}
            </span>
          )}
        </div>

        {steps.length === 0 && (
          <p className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            Aucun exercice pour l&apos;instant.
          </p>
        )}

        {steps.map((step, index) => {
          const exercise = exerciseById.get(step.cardioExerciseId)
          return (
            <div key={step.key} className="space-y-3 rounded-2xl border bg-background/80 backdrop-blur-sm p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted-foreground">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <Select value={step.cardioExerciseId} onValueChange={(v) => updateStep(step.key, { cardioExerciseId: v })}>
                    <SelectTrigger className="w-full" aria-label={`Mouvement de l'exercice ${index + 1}`}>
                      <SelectValue placeholder="Choisir un mouvement" />
                    </SelectTrigger>
                    <SelectContent>
                      {exercises.map((ex) => (
                        <SelectItem key={ex.id} value={ex.id}>
                          {ex.image ?? "🔥"} {ex.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={() => moveStep(index, -1)}
                  disabled={index === 0}
                  aria-label="Monter"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border text-muted-foreground disabled:opacity-30"
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(index, 1)}
                  disabled={index === steps.length - 1}
                  aria-label="Descendre"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border text-muted-foreground disabled:opacity-30"
                >
                  <ArrowDown className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSteps((prev) => prev.filter((s) => s.key !== step.key))}
                  aria-label="Retirer"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border text-red-500"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {exercise?.equipment && (
                <p className="text-xs text-muted-foreground">Matériel : {exercise.equipment}</p>
              )}

              {timed ? (
                <NumberStepper
                  label="Durée"
                  unit="s"
                  min={WOD_LIMITS.stepDurationSec.min}
                  max={WOD_LIMITS.stepDurationSec.max}
                  step={5}
                  value={step.durationSec}
                  onChange={(v) => updateStep(step.key, { durationSec: v ?? WOD_LIMITS.stepDurationSec.min })}
                />
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Pill active={step.unit === "reps"} onClick={() => updateStep(step.key, { unit: "reps" })}>
                      Répétitions
                    </Pill>
                    <Pill active={step.unit === "distance"} onClick={() => updateStep(step.key, { unit: "distance" })}>
                      Distance
                    </Pill>
                  </div>
                  {step.unit === "reps" ? (
                    <NumberStepper
                      label="Répétitions"
                      min={WOD_LIMITS.reps.min}
                      max={WOD_LIMITS.reps.max}
                      value={step.reps}
                      onChange={(v) => updateStep(step.key, { reps: v ?? WOD_LIMITS.reps.min })}
                    />
                  ) : (
                    <NumberStepper
                      label="Distance"
                      unit="m"
                      min={WOD_LIMITS.distanceM.min}
                      max={WOD_LIMITS.distanceM.max}
                      step={50}
                      value={step.distanceM}
                      onChange={(v) => updateStep(step.key, { distanceM: v ?? WOD_LIMITS.distanceM.min })}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}

        {steps.length < WOD_LIMITS.stepsMax && (
          <button
            type="button"
            onClick={addStep}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-3 text-sm font-semibold text-primary hover:border-primary"
          >
            <PlusCircle className="size-4" aria-hidden="true" />
            Ajouter un exercice
          </button>
        )}
      </section>

      {error && (
        <p role="alert" className="text-center text-sm text-red-500">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="w-full rounded-2xl py-4 text-lg font-bold text-white disabled:opacity-60"
        style={{ background: GRADIENT }}
      >
        {pending ? "Enregistrement…" : initial ? "Enregistrer les modifications" : "Créer le WOD"}
      </button>
    </div>
  )
}
