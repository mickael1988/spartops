"use client"

import { useState } from "react"
import { Trash2, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NumberStepper } from "@/components/ui/number-stepper"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { createWorkout } from "../actions"

type ExerciseOption = { id: string; name: string }
type GroupOption = { id: string; name: string; exercises: ExerciseOption[] }

type WorkoutEntry = {
  id: string
  exerciseId: string
  exerciseName: string
  sets: number
  reps: number
  weight: number | null
  restSeconds: number
}

export function WorkoutForm({ groups }: { groups: GroupOption[] }) {
  const [workoutName, setWorkoutName] = useState("")
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? "")
  const [selectedExerciseId, setSelectedExerciseId] = useState("")
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(10)
  const [weight, setWeight] = useState<number | null>(null)
  const [restSeconds, setRestSeconds] = useState(60)
  const [entries, setEntries] = useState<WorkoutEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const filteredExercises =
    groups.find((g) => g.id === selectedGroupId)?.exercises ?? []

  function handleGroupChange(groupId: string) {
    setSelectedGroupId(groupId)
    setSelectedExerciseId("")
  }

  function handleAddExercise() {
    const exercise = filteredExercises.find((e) => e.id === selectedExerciseId)
    if (!exercise) return
    setEntries((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets,
        reps,
        weight,
        restSeconds,
      },
    ])
    setSelectedExerciseId("")
    setWeight(null)
  }

  function handleRemove(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    setError("")
    if (!workoutName.trim()) {
      setError("Le nom de la séance est requis.")
      return
    }
    if (entries.length === 0) {
      setError("Ajoutez au moins un exercice.")
      return
    }
    setLoading(true)
    try {
      await createWorkout({
        name: workoutName,
        exercises: entries.map((e, i) => ({ ...e, order: i + 1 })),
      })
    } catch (err) {
      if (isRedirectError(err)) throw err
      setError("Une erreur est survenue. Réessayez.")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Nom de la séance */}
      <Card className="bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Nom de la séance</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Ex : Push Day, Full Body, Jambes…"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Ajouter un exercice */}
      <Card className="bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Ajouter un exercice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Groupe musculaire */}
          <div className="space-y-1.5">
            <Label>Groupe musculaire</Label>
            <Select value={selectedGroupId} onValueChange={handleGroupChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un groupe" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exercice */}
          <div className="space-y-1.5">
            <Label>Exercice</Label>
            <Select
              value={selectedExerciseId}
              onValueChange={setSelectedExerciseId}
              disabled={filteredExercises.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un exercice" />
              </SelectTrigger>
              <SelectContent>
                {filteredExercises.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id}>
                    {ex.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Séries / Reps / Poids / Repos */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-6">
            <NumberStepper label="Séries" min={1} max={20} value={sets} onChange={(v) => setSets(v ?? 1)} />
            <NumberStepper label="Répétitions" min={1} max={100} value={reps} onChange={(v) => setReps(v ?? 1)} />
            <NumberStepper
              label="Poids"
              unit="kg"
              min={0}
              max={500}
              step={2.5}
              allowEmpty
              placeholder="—"
              value={weight}
              onChange={setWeight}
            />
            <NumberStepper
              label="Repos"
              unit="sec"
              min={0}
              max={600}
              step={15}
              value={restSeconds}
              onChange={(v) => setRestSeconds(v ?? 0)}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleAddExercise}
            disabled={!selectedExerciseId}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Ajouter l&apos;exercice
          </Button>
        </CardContent>
      </Card>

      {/* Liste des exercices ajoutés */}
      {entries.length > 0 && (
        <Card className="bg-background/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Exercices de la séance ({entries.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{entry.exerciseName}</span>
                  <span className="text-muted-foreground ml-2">
                    {entry.sets} × {entry.reps} rép
                    {entry.weight ? ` · ${entry.weight} kg` : ""}
                    {" · "}
                    {entry.restSeconds}s repos
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(index)}
                  aria-label={`Supprimer ${entry.exerciseName}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Erreur + Submit */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        className="w-full border-0 text-white"
        style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        onClick={handleSubmit}
        disabled={loading || entries.length === 0 || !workoutName.trim()}
      >
        {loading ? "Enregistrement…" : "Enregistrer la séance"}
      </Button>
    </div>
  )
}
