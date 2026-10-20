import Link from "next/link"
import { redirect } from "next/navigation"
import { CalendarDays, Clock, Dumbbell, Trophy } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { formatClock, formatDate } from "@/lib/cardio/format"
import { formatScore, isRankedFormat, pickBest } from "@/lib/cardio/score"
import { CardioTabs } from "../cardio-tabs"
import { FormatBadge } from "../format-badge"

const HISTORY_LIMIT = 100

function StatCard({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background/80 backdrop-blur-sm p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

export default async function CardioHistoryPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const sessions = await prisma.userCardioSession.findMany({
    where: { userId: session.user.id },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      completedAt: true,
      elapsedSeconds: true,
      roundsCompleted: true,
      extraReps: true,
      program: { select: { id: true, name: true, image: true, format: true, isBenchmark: true } },
    },
  })

  // Records : meilleur score par WOD pour les formats qui se comparent (For Time, AMRAP)
  const byProgram = new Map<string, typeof sessions>()
  for (const s of sessions) {
    const list = byProgram.get(s.program.id) ?? []
    list.push(s)
    byProgram.set(s.program.id, list)
  }
  const records = [...byProgram.values()]
    .filter((list) => isRankedFormat(list[0].program.format))
    .map((list) => ({ best: pickBest(list[0].program.format, list)!, count: list.length, lastAt: list[0].completedAt }))
    .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
  const recordIds = new Set(records.map((r) => r.best.id))

  const totalSeconds = sessions.reduce((sum, s) => sum + s.elapsedSeconds, 0)
  const monthKey = (d: Date) => formatDate(d, { month: "long", year: "numeric" })
  const currentMonth = monthKey(new Date())
  const thisMonth = sessions.filter((s) => monthKey(s.completedAt) === currentMonth).length

  const recent = sessions.slice(0, HISTORY_LIMIT)
  const months: { label: string; items: typeof recent }[] = []
  for (const s of recent) {
    const label = monthKey(s.completedAt)
    const last = months[months.length - 1]
    if (last?.label === label) last.items.push(s)
    else months.push({ label, items: [s] })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cardio</h1>
        <p className="text-muted-foreground mt-1">Tes séances terminées et tes records.</p>
      </div>

      <CardioTabs active="historique" />

      {sessions.length === 0 ? (
        <div className="rounded-2xl border bg-background/80 backdrop-blur-sm p-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Aucune séance cardio enregistrée pour l&apos;instant.</p>
          <Link href="/cardio" className="text-sm font-medium text-primary hover:underline">
            Choisir un WOD
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Dumbbell} label="Séances" value={String(sessions.length)} />
            <StatCard icon={CalendarDays} label="Ce mois-ci" value={String(thisMonth)} />
            <StatCard icon={Clock} label="Temps total" value={formatClock(totalSeconds * 1000, "up")} />
            <StatCard icon={Trophy} label="Records" value={String(records.length)} />
          </div>

          {records.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Records personnels</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {records.map(({ best, count }) => (
                  <Link
                    key={best.program.id}
                    href={`/cardio/${best.program.id}`}
                    className="flex items-center gap-3 rounded-2xl border bg-background/80 backdrop-blur-sm p-3 transition-colors hover:border-primary"
                  >
                    <span className="text-2xl" aria-hidden="true">{best.program.image ?? "🔥"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{best.program.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(best.completedAt, { day: "numeric", month: "short", year: "numeric" })} · {count} fois
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 text-sm font-bold tabular-nums">
                      <Trophy className="size-4 text-amber-500" aria-hidden="true" />
                      {formatScore(best.program.format, best)}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Séances</h2>
            {months.map((month) => (
              <div key={month.label} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{month.label}</h3>
                <ul className="divide-y rounded-2xl border bg-background/80 backdrop-blur-sm">
                  {month.items.map((s) => (
                    <li key={s.id}>
                      <Link href={`/cardio/${s.program.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40">
                        <span className="text-xl" aria-hidden="true">{s.program.image ?? "🔥"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{s.program.name}</p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <FormatBadge format={s.program.format} />
                            <span className="text-xs text-muted-foreground">
                              {formatDate(s.completedAt, { weekday: "short", day: "numeric", month: "short" })}
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatScore(s.program.format, s)}
                          {recordIds.has(s.id) && " 🏆"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {sessions.length > HISTORY_LIMIT && (
              <p className="text-center text-xs text-muted-foreground">
                {HISTORY_LIMIT} dernières séances affichées sur {sessions.length}.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
