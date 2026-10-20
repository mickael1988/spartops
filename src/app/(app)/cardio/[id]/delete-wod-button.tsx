"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { deleteWod } from "../actions"

export function DeleteWodButton({ id, sessionCount }: { id: string; sessionCount: number }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function confirm() {
    setError("")
    startTransition(async () => {
      const result = await deleteWod(id)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push("/cardio?tab=perso")
      router.refresh()
    })
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-500"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Supprimer
      </button>
    )
  }

  return (
    <div className="w-full space-y-3 rounded-2xl border border-red-500/40 bg-red-500/5 p-4">
      <p className="text-sm">
        Supprimer ce WOD ?
        {sessionCount > 0 &&
          ` Tes ${sessionCount} séance${sessionCount > 1 ? "s" : ""} enregistrée${sessionCount > 1 ? "s" : ""} sur ce WOD ${sessionCount > 1 ? "seront supprimées" : "sera supprimée"} aussi.`}
      </p>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="flex-1 rounded-xl border py-2 text-sm font-semibold"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Suppression…" : "Supprimer"}
        </button>
      </div>
    </div>
  )
}
