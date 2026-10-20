import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { WodForm } from "../wod-form"

export default async function NewWodPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const exercises = await prisma.cardioExercise.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, image: true, equipment: true },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/cardio?tab=perso" className="hover:text-foreground transition-colors">Cardio</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium" aria-current="page">Nouveau WOD</span>
      </nav>
      <h1 className="text-3xl font-bold">Créer un WOD</h1>
      <WodForm exercises={exercises} />
    </div>
  )
}
