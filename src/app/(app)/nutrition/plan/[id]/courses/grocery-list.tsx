"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type GroceryGroup = { category: string; items: { id: string; name: string; quantity: string }[] }

const KEY_PREFIX = "nutrition-courses:v1:"

export function GroceryList({ planId, groups }: { planId: string; groups: GroceryGroup[] }) {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY_PREFIX + planId)
      const parsed: unknown = raw ? JSON.parse(raw) : []
      // localStorage ne se lit qu'après l'hydratation, sinon le rendu SSR ne correspond pas
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(parsed)) setChecked(new Set(parsed.filter((v): v is string => typeof v === "string")))
    } catch {
      // stockage indisponible : la liste reste utilisable sans mémoire
    }
  }, [planId])

  function persist(next: Set<string>) {
    setChecked(next)
    try {
      window.localStorage.setItem(KEY_PREFIX + planId, JSON.stringify([...next]))
    } catch {
      // ignoré
    }
  }

  function toggle(id: string) {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    persist(next)
  }

  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {checked.size} / {total} articles dans le panier
        </span>
        {checked.size > 0 && (
          <button type="button" onClick={() => persist(new Set())} className="text-muted-foreground underline">
            Tout décocher
          </button>
        )}
      </div>
      {groups.map((group) => (
        <section key={group.category} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.category}</h2>
          <ul className="divide-y rounded-2xl border bg-background/80 backdrop-blur-sm">
            {group.items.map((item) => {
              const done = checked.has(item.id)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    aria-pressed={done}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left"
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-md border",
                        done ? "border-transparent bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {done && <Check className="size-3.5" aria-hidden="true" />}
                    </span>
                    <span className={cn("flex-1 text-sm first-letter:uppercase", done && "text-muted-foreground line-through")}>
                      {item.name}
                    </span>
                    <span className={cn("shrink-0 text-sm font-medium tabular-nums", done && "text-muted-foreground")}>
                      {item.quantity}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
