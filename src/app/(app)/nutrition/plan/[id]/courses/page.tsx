import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { getSession } from "@/lib/session"
import { formatFactor, formatQuantity } from "@/lib/nutrition/display"
import { loadPlanForUser } from "../../../plan-data"
import { GroceryList, type GroceryGroup } from "./grocery-list"

export default async function GroceryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect("/login")

  const data = await loadPlanForUser(id, session.user.id)
  if (!data) notFound()
  const { plan, week, factor } = data

  const groups: GroceryGroup[] = []
  for (const item of week.groceryItems) {
    const entry = { id: item.id, name: item.name, quantity: formatQuantity(item.quantity, item.unit, factor) }
    const last = groups[groups.length - 1]
    if (last?.category === item.category) last.items.push(entry)
    else groups.push({ category: item.category, items: [entry] })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/nutrition" className="hover:text-foreground transition-colors">Nutrition</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/nutrition/plan/${plan.id}`} className="hover:text-foreground transition-colors">{plan.name}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium" aria-current="page">Courses</span>
      </nav>
      <div>
        <h1 className="text-3xl font-bold">Liste de courses</h1>
        <p className="text-muted-foreground mt-1">
          Pour la semaine {plan.name.toLowerCase()}
          {factor !== 1 && `, quantités ajustées pour toi (${formatFactor(factor)})`}.
        </p>
      </div>
      <GroceryList planId={plan.id} groups={groups} />
    </div>
  )
}
