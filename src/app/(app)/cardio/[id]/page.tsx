import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronRight, Pencil, Trophy } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { formatScore, isRankedFormat, pickBest } from "@/lib/cardio/score"
import { formatDate } from "@/lib/cardio/format"
import { FormatBadge } from "../format-badge"
import { CaloriesChip, ClassicChip, DurationChip, EquipmentChip, LevelChip } from "../wod-meta"
import { ResumeBanner } from "./resume-banner"
import { DeleteWodButton } from "./delete-wod-button"

const DURATION_LABELS = {
  CIRCUIT: (n: number) => `Durée totale : ${n} min`,
  AMRAP: (n: number) => `Temps limite : ${n} min`,
  EMOM: (n: number) => `Une série chaque minute pendant ${n} min`,
  FOR_TIME: (n: number) => `Temps indicatif : ${n} min`,
} as const

function formatStepUnit(step: { durationSec: number | null; reps: number | null; distanceM: number | null }) {
  if (step.durationSec !== null) return `${step.durationSec}s`
  if (step.distanceM !== null) return `${step.distanceM.toLocaleString("fr-FR")} m`
  return `${step.reps} reps`
}

export default async function CardioWodPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect("/login")

  const wod = await prisma.cardioProgram.findFirst({
    where: { id, OR: [{ userId: null }, { userId: session.user.id }] },
    include: {
      steps: {
        include: { cardioExercise: true },
        orderBy: { order: "asc" },
      },
    },
  })

  if (!wod) notFound()

  const isOwn = wod.userId === session.user.id
  const sessions = await prisma.userCardioSession.findMany({
    where: { userId: session.user.id, programId: wod.id },
    orderBy: { completedAt: "desc" },
    select: { id: true, completedAt: true, elapsedSeconds: true, roundsCompleted: true, extraReps: true },
  })
  const best = pickBest(wod.format, sessions)
  const backHref = isOwn ? "/cardio?tab=perso" : wod.isBenchmark ? "/cardio?tab=classiques" : "/cardio"

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href={backHref}
          className="hover:text-foreground transition-colors"
        >
          Cardio
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium" aria-current="page">{wod.name}</span>
      </nav>

      {/* En-tête */}
      <div>
        <div className="flex items-center gap-3">
          <span className="text-4xl" aria-hidden="true">{wod.image ?? "🔥"}</span>
          <h1 className="text-3xl font-bold">{wod.name}</h1>
        </div>
        {wod.description && <p className="text-muted-foreground mt-1">{wod.description}</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          <FormatBadge format={wod.format} withHint />
          {wod.isBenchmark && <ClassicChip />}
          <LevelChip level={wod.level} />
          <DurationChip>{DURATION_LABELS[wod.format](wod.durationMin)}</DurationChip>
          <EquipmentChip equipment={wod.equipment} />
          {wod.calories != null && <CaloriesChip calories={wod.calories} />}
        </div>
      </div>

      {isOwn && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/cardio/${wod.id}/modifier`}
            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold hover:border-primary hover:text-primary"
          >
            <Pencil className="size-4" aria-hidden="true" />
            Modifier
          </Link>
          <DeleteWodButton id={wod.id} sessionCount={sessions.length} />
        </div>
      )}

      <ResumeBanner programId={wod.id} />

      {/* Déroulé des étapes */}
      <div className="space-y-2">
        {wod.steps.map((step) => (
          <div
            key={step.id}
            className="flex items-center gap-3 rounded-xl border bg-background/80 backdrop-blur-sm px-4 py-3"
          >
            <span className="text-2xl" aria-hidden="true">{step.cardioExercise.image ?? "🔥"}</span>
            <div className="flex-1">
              <p className="font-medium text-sm">{step.cardioExercise.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatStepUnit(step)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {sessions.length > 0 && (
        <section className="space-y-3 rounded-2xl border bg-background/80 backdrop-blur-sm p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-semibold">Ton historique</h2>
            <span className="text-xs text-muted-foreground">
              Fait {sessions.length} fois
            </span>
          </div>
          {best && (
            <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 px-3 py-2">
              <Trophy className="size-5 shrink-0 text-amber-500" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">Record : {formatScore(wod.format, best)}</p>
                <p className="text-xs text-muted-foreground">
                  le {formatDate(best.completedAt, { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          )}
          <ul className="divide-y text-sm">
            {sessions.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-muted-foreground">
                  {formatDate(s.completedAt, { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <span className="font-medium tabular-nums">
                  {isRankedFormat(wod.format) ? formatScore(wod.format, s) : `Terminé · ${formatScore(wod.format, s)}`}
                  {best?.id === s.id && " 🏆"}
                </span>
              </li>
            ))}
          </ul>
          {sessions.length > 5 && (
            <Link href="/cardio/historique" className="block text-center text-xs font-medium text-primary hover:underline">
              Voir tout l&apos;historique
            </Link>
          )}
        </section>
      )}

      <Link
        href={`/cardio/${wod.id}/seance`}
        className="block w-full rounded-2xl py-4 text-center text-lg font-bold text-white"
        style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
      >
        Démarrer
      </Link>
    </div>
  )
}
