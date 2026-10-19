import Link from "next/link"
import { Ban, Search, ShieldCheck, UserPlus, Users } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { UserActions } from "./user-actions"

const GRADIENT = "linear-gradient(to right, #3F5EFB, #F50535)"
const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" })
const DATE_TIME = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <Card className="bg-background/80 backdrop-blur-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg p-2 text-white" style={{ background: GRADIENT }}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function isCurrentlyBanned(user: { banned: boolean | null; banExpires: Date | null }, now: Date) {
  return !!user.banned && (!user.banExpires || user.banExpires > now)
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireAdmin()
  const { q: rawQ } = await searchParams
  const q = rawQ?.trim().slice(0, 100) || undefined
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [total, newThisWeek, bannedCount, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { banned: true, OR: [{ banExpires: null }, { banExpires: { gt: now } }] } }),
    prisma.user.findMany({
      where: q
        ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        banReason: true,
        banExpires: true,
        createdAt: true,
        _count: { select: { workouts: { where: { completedAt: { not: null } } }, cardioSessions: true } },
        sessions: { orderBy: { updatedAt: "desc" }, take: 1, select: { updatedAt: true } },
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="text-muted-foreground mt-1">Gère les personnes inscrites sur SpartOps.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={Users} label="Inscrits" value={total} />
        <StatCard icon={UserPlus} label="Nouveaux (7 derniers jours)" value={newThisWeek} />
        <StatCard icon={Ban} label="Bannis" value={bannedCount} />
      </div>

      <form className="relative max-w-md" role="search">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="Rechercher par nom ou email…"
          aria-label="Rechercher un utilisateur"
          className="pl-9 bg-background/80"
        />
      </form>

      {q && (
        <p className="text-sm text-muted-foreground">
          {users.length} résultat{users.length > 1 ? "s" : ""} pour « {q} » ·{" "}
          <Link href="/admin" className="text-primary hover:underline">Effacer</Link>
        </p>
      )}

      <div className="space-y-3">
        {users.map((user) => {
          const banned = isCurrentlyBanned(user, now)
          const lastSeen = user.sessions[0]?.updatedAt
          const isSelf = user.id === session.user.id

          return (
            <Card key={user.id} className={`bg-background/80 backdrop-blur-sm ${banned ? "opacity-75" : ""}`}>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold truncate">{user.name}</p>
                    {user.role === "admin" && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        <ShieldCheck className="size-3.5" aria-hidden="true" />
                        Admin
                      </span>
                    )}
                    {isSelf && <span className="text-xs text-muted-foreground">(toi)</span>}
                    {banned && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
                        <Ban className="size-3.5" aria-hidden="true" />
                        {user.banExpires ? `Banni jusqu'au ${DATE.format(user.banExpires)}` : "Banni définitivement"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  {banned && user.banReason && (
                    <p className="text-xs text-red-700 dark:text-red-300">Motif : {user.banReason}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Inscrit le {DATE.format(user.createdAt)} ·{" "}
                    {lastSeen ? `Vu le ${DATE_TIME.format(lastSeen)}` : "Jamais connecté depuis"} ·{" "}
                    {user._count.workouts} séance{user._count.workouts > 1 ? "s" : ""} muscu ·{" "}
                    {user._count.cardioSessions} cardio
                  </p>
                </div>

                {!isSelf && (
                  <UserActions userId={user.id} userName={user.name} userEmail={user.email} banned={banned} />
                )}
              </CardContent>
            </Card>
          )
        })}

        {users.length === 0 && (
          <p className="rounded-2xl border bg-background/80 p-6 text-center text-sm text-muted-foreground">
            Aucun utilisateur trouvé.
          </p>
        )}
      </div>
    </div>
  )
}
