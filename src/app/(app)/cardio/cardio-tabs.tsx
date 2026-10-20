import Link from "next/link"
import { History, LayoutGrid, Trophy, UserRound, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type CardioTab = "catalogue" | "classiques" | "perso" | "historique"

const GRADIENT = "linear-gradient(to right, #3F5EFB, #F50535)"

const TABS: { key: CardioTab; href: string; label: string; icon: LucideIcon }[] = [
  { key: "catalogue", href: "/cardio", label: "Nos WOD", icon: LayoutGrid },
  { key: "classiques", href: "/cardio?tab=classiques", label: "Classiques", icon: Trophy },
  { key: "perso", href: "/cardio?tab=perso", label: "Mes WOD", icon: UserRound },
  { key: "historique", href: "/cardio/historique", label: "Historique", icon: History },
]

export function CardioTabs({ active }: { active: CardioTab }) {
  return (
    <nav aria-label="Cardio" className="flex flex-nowrap gap-2 overflow-x-auto">
      {TABS.map(({ key, href, label, icon: Icon }) => {
        const isActive = key === active
        return (
          <Link
            key={key}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold transition-colors sm:px-4",
              isActive
                ? "text-white border-transparent"
                : "text-muted-foreground hover:border-primary hover:text-primary",
            )}
            style={isActive ? { background: GRADIENT } : undefined}
          >
            <Icon className="hidden size-4 sm:block" aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
