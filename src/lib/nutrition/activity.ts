/**
 * Estimation des calories dépensées pendant les séances du jour (méthode MET :
 * kcal = MET × poids (kg) × durée (h)). C'est un ordre de grandeur, pas une mesure.
 */
const MET_STRENGTH = 5
const MET_CARDIO = 8
const DEFAULT_STRENGTH_MIN = 45

/**
 * Le niveau d'activité choisi dans le profil compte déjà une partie de l'entraînement :
 * on ne rajoute que la moitié de la dépense estimée, en glucides.
 */
const BONUS_SHARE = 0.5

export type DayActivity = {
  kind: "muscu" | "cardio"
  name: string
  minutes: number
  kcal: number
}

function kcalFor(met: number, weightKg: number, minutes: number) {
  return Math.round((met * weightKg * minutes) / 60)
}

export function strengthActivity(
  workout: { name: string; startedAt: Date | null; completedAt: Date | null },
  weightKg: number,
): DayActivity {
  const measured =
    workout.startedAt && workout.completedAt
      ? (workout.completedAt.getTime() - workout.startedAt.getTime()) / 60000
      : DEFAULT_STRENGTH_MIN
  // Une séance oubliée « en cours » pendant des heures ne doit pas exploser le compteur.
  const minutes = Math.round(Math.min(120, Math.max(10, measured)))
  return { kind: "muscu", name: workout.name, minutes, kcal: kcalFor(MET_STRENGTH, weightKg, minutes) }
}

export function cardioActivity(
  session: { elapsedSeconds: number; program: { name: string } },
  weightKg: number,
): DayActivity {
  const minutes = Math.max(1, Math.round(Math.min(180 * 60, session.elapsedSeconds) / 60))
  return { kind: "cardio", name: session.program.name, minutes, kcal: kcalFor(MET_CARDIO, weightKg, minutes) }
}

export function trainingBonus(activities: DayActivity[]): number {
  const burned = activities.reduce((sum, a) => sum + a.kcal, 0)
  return Math.round((burned * BONUS_SHARE) / 10) * 10
}
