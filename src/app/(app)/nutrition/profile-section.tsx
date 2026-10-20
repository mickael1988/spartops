"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { ProfileForm, type ProfileFormInitial } from "./profile-form"

/** Affiche les besoins calculés (children), ou le formulaire tant qu'aucun profil n'existe / en modification. */
export function ProfileSection({
  initial,
  hasProfile,
  children,
}: {
  initial: ProfileFormInitial
  hasProfile: boolean
  children: React.ReactNode
}) {
  const [editing, setEditing] = useState(false)

  if (!hasProfile || editing) {
    return (
      <section className="space-y-4 rounded-2xl border bg-background/80 backdrop-blur-sm p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{hasProfile ? "Mes informations" : "Calcule tes besoins"}</h2>
            {!hasProfile && (
              <p className="text-sm text-muted-foreground">
                Quelques infos pour estimer tes calories et tes macros au quotidien.
              </p>
            )}
          </div>
          {editing && (
            <button type="button" onClick={() => setEditing(false)} className="text-sm text-muted-foreground underline">
              Annuler
            </button>
          )}
        </div>
        <ProfileForm initial={initial} onSaved={() => setEditing(false)} />
      </section>
    )
  }

  return (
    <div className="space-y-2">
      {children}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <Pencil className="size-3.5" aria-hidden="true" />
        Modifier mes infos
      </button>
    </div>
  )
}
