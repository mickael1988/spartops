"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Ban, Trash2, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { banUser, deleteUser, unbanUser, type BanDuration } from "./actions"

const DURATIONS: { value: BanDuration; label: string }[] = [
  { value: "1j", label: "1 jour" },
  { value: "7j", label: "7 jours" },
  { value: "30j", label: "30 jours" },
  { value: "definitif", label: "Définitif" },
]

type Mode = "idle" | "ban" | "delete"

export function UserActions({
  userId,
  userName,
  userEmail,
  banned,
}: {
  userId: string
  userName: string
  userEmail: string
  banned: boolean
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("idle")
  const [duration, setDuration] = useState<BanDuration>("7j")
  const [reason, setReason] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        setMode("idle")
        setReason("")
        setConfirmEmail("")
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Une erreur est survenue")
      }
    })
  }

  if (mode === "ban") {
    return (
      <div className="w-full space-y-2 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 md:w-80">
        <p className="text-sm font-medium">Bannir {userName} ?</p>
        <div className="flex flex-wrap gap-1.5">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDuration(d.value)}
              aria-pressed={duration === d.value}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                duration === d.value
                  ? "text-white border-transparent"
                  : "bg-muted/40 text-foreground/70 border-border hover:border-primary"
              }`}
              style={duration === d.value ? { background: "linear-gradient(to right, #3F5EFB, #F50535)" } : undefined}
            >
              {d.label}
            </button>
          ))}
        </div>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motif (optionnel, visible par toi seul)"
          maxLength={300}
          className="h-8 text-sm"
        />
        <p className="text-xs text-muted-foreground">La personne sera déconnectée immédiatement.</p>
        {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => banUser(userId, duration, reason))}>
            {pending ? "…" : "Confirmer le bannissement"}
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => { setMode("idle"); setError(null) }}>
            Annuler
          </Button>
        </div>
      </div>
    )
  }

  if (mode === "delete") {
    const canDelete = confirmEmail.trim().toLowerCase() === userEmail.toLowerCase()
    return (
      <div className="w-full space-y-2 rounded-lg border border-red-500/40 bg-red-500/5 p-3 md:w-80">
        <p className="text-sm font-medium text-red-700 dark:text-red-300">Supprimer définitivement {userName} ?</p>
        <p className="text-xs text-muted-foreground">
          Son compte, ses séances, programmes, records et résultats cardio seront effacés. C&apos;est irréversible.
        </p>
        <Input
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          placeholder={`Tape ${userEmail} pour confirmer`}
          aria-label="Email de confirmation"
          autoComplete="off"
          className="h-8 text-sm"
        />
        {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" disabled={!canDelete || pending} onClick={() => run(() => deleteUser(userId))}>
            {pending ? "…" : "Supprimer"}
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => { setMode("idle"); setError(null); setConfirmEmail("") }}>
            Annuler
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex shrink-0 flex-col gap-1 md:items-end">
      <div className="flex gap-2">
        {banned ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => unbanUser(userId))}>
            <Undo2 className="size-4" aria-hidden="true" />
            Débannir
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setMode("ban")}>
            <Ban className="size-4" aria-hidden="true" />
            Bannir
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 hover:text-red-700 dark:text-red-400"
          onClick={() => setMode("delete")}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Supprimer
        </Button>
      </div>
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
