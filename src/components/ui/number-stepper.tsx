"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const HOLD_DELAY_MS = 400
const HOLD_INTERVAL_MS = 90

type Props = {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  /** Autorise une valeur vide (ex. poids optionnel). Sinon un champ vidé revient au minimum. */
  allowEmpty?: boolean
  /** Unité affichée à côté du libellé, ex. "kg". */
  unit?: string
  placeholder?: string
  className?: string
}

function roundToStep(value: number) {
  return Math.round(value * 100) / 100
}

function formatValue(value: number | null) {
  if (value === null) return ""
  return String(value).replace(".", ",")
}

/**
 * Champ numérique pensé pour le téléphone en pleine séance :
 * gros boutons − / + (maintenir pour défiler), et le chiffre reste modifiable au clavier —
 * il est entièrement sélectionné au toucher et peut être vidé pendant la saisie ;
 * les bornes ne sont appliquées qu'en quittant le champ.
 */
export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  allowEmpty = false,
  unit,
  placeholder = "—",
  className,
}: Props) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const valueRef = useRef(value)
  const holdTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  function clamp(v: number) {
    return Math.min(max, Math.max(min, roundToStep(v)))
  }

  function bump(direction: 1 | -1) {
    const current = valueRef.current
    const next = current === null ? min : clamp(current + direction * step)
    valueRef.current = next
    onChange(next)
    // Le bouton devient disabled à la borne : il ne recevra plus de pointerup, on coupe ici.
    if ((direction < 0 && next <= min) || (direction > 0 && next >= max)) stopHold()
  }

  function startHold(direction: 1 | -1) {
    stopHold()
    bump(direction)
    holdTimeout.current = setTimeout(() => {
      holdInterval.current = setInterval(() => bump(direction), HOLD_INTERVAL_MS)
    }, HOLD_DELAY_MS)
  }

  function stopHold() {
    if (holdTimeout.current) clearTimeout(holdTimeout.current)
    if (holdInterval.current) clearInterval(holdInterval.current)
    holdTimeout.current = null
    holdInterval.current = null
  }

  // Coupe un éventuel défilement en cours si le composant disparaît (ex. série validée).
  useEffect(() => stopHold, [])

  function commit(text: string) {
    setDraft(null)
    const parsed = parseFloat(text.replace(",", "."))
    if (text.trim() === "" || !Number.isFinite(parsed)) {
      onChange(allowEmpty ? null : clamp(value ?? min))
      return
    }
    onChange(clamp(parsed))
  }

  const atMin = value !== null && value <= min
  const atMax = value !== null && value >= max
  const buttonClass =
    "flex size-11 shrink-0 items-center justify-center rounded-xl border bg-muted/50 text-foreground transition-colors select-none touch-manipulation active:scale-95 active:bg-muted disabled:opacity-30 disabled:active:scale-100"

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
        {unit && <span className="ml-1 text-xs">({unit})</span>}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Diminuer ${label}`}
          disabled={atMin}
          onPointerDown={(e) => {
            e.preventDefault()
            startHold(-1)
          }}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              bump(-1)
            }
          }}
          className={buttonClass}
        >
          <Minus className="size-5" aria-hidden="true" />
        </button>
        <input
          id={id}
          type="text"
          inputMode={Number.isInteger(step) ? "numeric" : "decimal"}
          enterKeyHint="done"
          autoComplete="off"
          value={draft ?? formatValue(value)}
          placeholder={placeholder}
          onFocus={(e) => {
            setDraft(formatValue(value))
            e.currentTarget.select()
          }}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9.,]/g, ""))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur()
          }}
          className="h-11 w-16 rounded-xl border bg-background text-center text-lg font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="button"
          aria-label={`Augmenter ${label}`}
          disabled={atMax}
          onPointerDown={(e) => {
            e.preventDefault()
            startHold(1)
          }}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              bump(1)
            }
          }}
          className={buttonClass}
        >
          <Plus className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
