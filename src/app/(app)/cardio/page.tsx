import Link from "next/link"
import { Layers, Plus, type LucideIcon } from "lucide-react"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { cn } from "@/lib/utils"
import { WodCard } from "./wod-card"
import { CardioTabs } from "./cardio-tabs"
import { FORMAT_CONFIG } from "./format-badge"
import { EQUIPMENT_ICONS, LEVEL_CONFIG } from "./wod-meta"

const FORMATS = [
  { value: "CIRCUIT", label: "Circuit" },
  { value: "AMRAP", label: "AMRAP" },
  { value: "EMOM", label: "EMOM" },
  { value: "FOR_TIME", label: "For Time" },
] as const

const GRADIENT = "linear-gradient(to right, #3F5EFB, #F50535)"

const LEVELS = [
  { value: "DEBUTANT", label: "Débutant" },
  { value: "INTERMEDIAIRE", label: "Intermédiaire" },
  { value: "AVANCE", label: "Avancé" },
] as const

function FilterPill({
  href,
  active,
  icon: Icon,
  compact = false,
  children,
}: {
  href: string
  active: boolean
  icon?: LucideIcon
  /** Mobile : padding réduit et icône masquée, pour tenir sur une seule ligne. */
  compact?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border py-1 text-xs font-medium transition-colors",
        compact ? "px-2 sm:px-3" : "px-3",
        active
          ? "text-white border-transparent font-semibold shadow-sm"
          : "bg-muted/40 text-foreground/70 border-border hover:border-primary hover:text-primary",
      )}
      style={active ? { background: GRADIENT } : undefined}
    >
      {Icon && <Icon className={cn("size-3.5 shrink-0", compact && "hidden sm:block")} aria-hidden="true" />}
      {children}
    </Link>
  )
}

export default async function CardioPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; format?: string; level?: string; equipment?: string }>
}) {
  const { tab: rawTab, format, level, equipment } = await searchParams

  const session = await getSession()
  if (!session) redirect("/login")

  const tab = rawTab === "classiques" ? "classiques" : rawTab === "perso" ? "perso" : "catalogue"
  const validFormat = FORMATS.find((f) => f.value === format)?.value
  const validLevel = LEVELS.find((l) => l.value === level)?.value
  const validEquipment = equipment === "avec" || equipment === "sans" ? equipment : undefined

  const wods = await prisma.cardioProgram.findMany({
    where: {
      ...(tab === "perso"
        ? { userId: session.user.id }
        : { userId: null, isBenchmark: tab === "classiques" }),
      format: validFormat,
      level: validLevel,
      equipment: validEquipment === "sans" ? null : validEquipment === "avec" ? { not: null } : undefined,
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, format: true, level: true, durationMin: true, equipment: true, image: true },
  })

  function buildHref(next: Partial<{ format: string; level: string; equipment: string }>) {
    const params = new URLSearchParams()
    const merged = { format: validFormat, level: validLevel, equipment: validEquipment, ...next }
    if (tab !== "catalogue") params.set("tab", tab)
    if (merged.format) params.set("format", merged.format)
    if (merged.level) params.set("level", merged.level)
    if (merged.equipment) params.set("equipment", merged.equipment)
    const qs = params.toString()
    return qs ? `/cardio?${qs}` : "/cardio"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cardio</h1>
          {tab === "classiques" && (
            <p className="text-muted-foreground mt-1">
              Les benchmarks historiques du CrossFit, à refaire régulièrement pour mesurer ta progression.
            </p>
          )}
          {tab === "perso" && (
            <p className="text-muted-foreground mt-1">Tes WOD sur mesure, avec le minuteur et l&apos;historique comme les autres.</p>
          )}
          <p className="text-muted-foreground mt-1">{wods.length} WOD disponible{wods.length > 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/cardio/nouveau"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm"
          style={{ background: GRADIENT }}
        >
          <Plus className="size-4" aria-hidden="true" />
          Créer un WOD
        </Link>
      </div>

      <CardioTabs active={tab} />

      <div className="flex flex-col gap-2">
        <div className="flex flex-nowrap gap-1 sm:gap-2 overflow-x-auto">
          <FilterPill href={buildHref({ format: undefined })} active={!validFormat} icon={Layers} compact>
            Tous les formats
          </FilterPill>
          {FORMATS.map((f) => (
            <FilterPill
              key={f.value}
              href={buildHref({ format: f.value })}
              active={validFormat === f.value}
              icon={FORMAT_CONFIG[f.value].icon}
              compact
            >
              {f.label}
            </FilterPill>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterPill href={buildHref({ level: undefined })} active={!validLevel} icon={Layers}>Tous les niveaux</FilterPill>
          {LEVELS.map((l) => (
            <FilterPill
              key={l.value}
              href={buildHref({ level: l.value })}
              active={validLevel === l.value}
              icon={LEVEL_CONFIG[l.value].icon}
            >
              {l.label}
            </FilterPill>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterPill href={buildHref({ equipment: undefined })} active={!validEquipment} icon={Layers}>Tout matériel</FilterPill>
          <FilterPill href={buildHref({ equipment: "sans" })} active={validEquipment === "sans"} icon={EQUIPMENT_ICONS.sans}>
            Sans matériel
          </FilterPill>
          <FilterPill href={buildHref({ equipment: "avec" })} active={validEquipment === "avec"} icon={EQUIPMENT_ICONS.avec}>
            Avec matériel
          </FilterPill>
        </div>
      </div>

      {wods.length === 0 && tab === "perso" && !validFormat && !validLevel && !validEquipment ? (
        <div className="rounded-2xl border bg-background/80 backdrop-blur-sm p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Tu n&apos;as pas encore créé de WOD.</p>
          <Link href="/cardio/nouveau" className="text-sm font-medium text-primary hover:underline">
            Créer mon premier WOD
          </Link>
        </div>
      ) : wods.length === 0 ? (
        <div className="rounded-2xl border bg-background/80 backdrop-blur-sm p-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Aucun WOD ne correspond à ces filtres.</p>
          <Link
            href={buildHref({ format: undefined, level: undefined, equipment: undefined })}
            className="text-sm font-medium text-primary hover:underline"
          >
            Réinitialiser les filtres
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wods.map((wod) => (
            <WodCard key={wod.id} wod={wod} />
          ))}
        </div>
      )}
    </div>
  )
}
