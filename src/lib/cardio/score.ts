import { formatClock } from "./format"
import type { WodFormat } from "./timeline"

export type ScoreInput = {
  elapsedSeconds: number
  roundsCompleted: number | null
  extraReps: number | null
}

/** Formats où le score se compare d'une séance à l'autre (les autres ont une durée fixe). */
export function isRankedFormat(format: WodFormat): boolean {
  return format === "FOR_TIME" || format === "AMRAP"
}

export function formatScore(format: WodFormat, score: ScoreInput): string {
  if (format === "AMRAP") {
    const rounds = score.roundsCompleted ?? 0
    const extra = score.extraReps ?? 0
    const roundsLabel = `${rounds} tour${rounds > 1 ? "s" : ""}`
    return extra > 0 ? `${roundsLabel} + ${extra} reps` : roundsLabel
  }
  return formatClock(score.elapsedSeconds * 1000, "up")
}

/** < 0 si `a` est meilleur que `b`, > 0 si moins bon, 0 si égal (ou format non classé). */
export function compareScores(format: WodFormat, a: ScoreInput, b: ScoreInput): number {
  if (format === "FOR_TIME") return a.elapsedSeconds - b.elapsedSeconds
  if (format === "AMRAP") {
    const rounds = (b.roundsCompleted ?? 0) - (a.roundsCompleted ?? 0)
    if (rounds !== 0) return rounds
    return (b.extraReps ?? 0) - (a.extraReps ?? 0)
  }
  return 0
}

/** Meilleur score (le plus ancien en cas d'égalité), ou null si le format n'est pas classé. */
export function pickBest<T extends ScoreInput & { completedAt: Date }>(format: WodFormat, sessions: T[]): T | null {
  if (!isRankedFormat(format)) return null
  let best: T | null = null
  for (const session of sessions) {
    if (best === null) {
      best = session
      continue
    }
    const cmp = compareScores(format, session, best)
    if (cmp < 0 || (cmp === 0 && session.completedAt < best.completedAt)) best = session
  }
  return best
}
