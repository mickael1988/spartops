import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { WodForm } from "../../wod-form"

export default async function EditWodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect("/login")

  const [wod, exercises] = await Promise.all([
    prisma.cardioProgram.findFirst({
      where: { id, userId: session.user.id },
      include: { steps: { orderBy: { order: "asc" } } },
    }),
    prisma.cardioExercise.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, image: true, equipment: true },
    }),
  ])
  if (!wod) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/cardio?tab=perso" className="hover:text-foreground transition-colors">Cardio</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/cardio/${wod.id}`} className="hover:text-foreground transition-colors truncate">{wod.name}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium" aria-current="page">Modifier</span>
      </nav>
      <h1 className="text-3xl font-bold">Modifier le WOD</h1>
      <WodForm
        exercises={exercises}
        initial={{
          id: wod.id,
          name: wod.name,
          description: wod.description,
          image: wod.image,
          format: wod.format,
          level: wod.level,
          durationMin: wod.durationMin,
          steps: wod.steps.map((s) => ({
            cardioExerciseId: s.cardioExerciseId,
            durationSec: s.durationSec,
            reps: s.reps,
            distanceM: s.distanceM,
          })),
        }}
      />
    </div>
  )
}
