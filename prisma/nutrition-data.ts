import type { PrismaClient } from "../src/generated/prisma/client"

// ==========================================
// Plans nutrition types (contenu officiel)
// Les macros des repas et la liste de courses sont calculées à partir des ingrédients :
// valeurs nutritionnelles moyennes pour 100 g (table Ciqual / étiquettes courantes).
// ==========================================

type Food = {
  name: string
  kcal: number
  protein: number
  carbs: number
  fats: number
  category: "Viandes & poissons" | "Produits frais" | "Féculents & céréales" | "Fruits & légumes" | "Épicerie"
  /** Affichage : "g" par défaut, "ml" pour les liquides, ou une pièce de N grammes. */
  unit?: "ml" | { piece: string; grams: number }
  /** Précision affichée dans la description (ex. "poids cru"). */
  note?: string
}

const FOODS = {
  avoine: { name: "flocons d'avoine", kcal: 372, protein: 13.5, carbs: 58.7, fats: 7, category: "Féculents & céréales" },
  painComplet: { name: "pain complet", kcal: 247, protein: 13, carbs: 41, fats: 3.4, category: "Féculents & céréales" },
  riz: { name: "riz basmati", kcal: 350, protein: 8, carbs: 77, fats: 0.9, category: "Féculents & céréales", note: "poids cru" },
  pates: { name: "pâtes complètes", kcal: 350, protein: 13, carbs: 64, fats: 2.5, category: "Féculents & céréales", note: "poids cru" },
  quinoa: { name: "quinoa", kcal: 368, protein: 14, carbs: 64, fats: 6, category: "Féculents & céréales", note: "poids cru" },
  tortilla: { name: "tortillas complètes", kcal: 300, protein: 9, carbs: 50, fats: 7, category: "Féculents & céréales", unit: { piece: "tortilla", grams: 60 } },
  patateDouce: { name: "patate douce", kcal: 86, protein: 1.6, carbs: 20, fats: 0.1, category: "Fruits & légumes" },
  pommeDeTerre: { name: "pommes de terre", kcal: 77, protein: 2, carbs: 17, fats: 0.1, category: "Fruits & légumes" },
  poulet: { name: "blanc de poulet", kcal: 110, protein: 23, carbs: 0, fats: 1.5, category: "Viandes & poissons" },
  dinde: { name: "escalope de dinde", kcal: 105, protein: 24, carbs: 0, fats: 1, category: "Viandes & poissons" },
  steak: { name: "steak haché 5 %", kcal: 125, protein: 21, carbs: 0, fats: 5, category: "Viandes & poissons" },
  saumon: { name: "pavé de saumon", kcal: 200, protein: 20, carbs: 0, fats: 13, category: "Viandes & poissons" },
  cabillaud: { name: "dos de cabillaud", kcal: 80, protein: 18, carbs: 0, fats: 0.7, category: "Viandes & poissons" },
  thon: { name: "thon au naturel", kcal: 110, protein: 26, carbs: 0, fats: 1, category: "Épicerie", note: "égoutté" },
  oeufs: { name: "œufs", kcal: 140, protein: 12.5, carbs: 0.7, fats: 9.5, category: "Produits frais", unit: { piece: "œuf", grams: 60 } },
  fromageBlanc: { name: "fromage blanc 0 %", kcal: 45, protein: 7.5, carbs: 4, fats: 0.2, category: "Produits frais" },
  skyr: { name: "skyr", kcal: 60, protein: 11, carbs: 4, fats: 0.2, category: "Produits frais" },
  lait: { name: "lait demi-écrémé", kcal: 46, protein: 3.3, carbs: 4.8, fats: 1.6, category: "Produits frais", unit: "ml" },
  lentilles: { name: "lentilles cuites", kcal: 116, protein: 9, carbs: 20, fats: 0.4, category: "Épicerie" },
  poisChiches: { name: "pois chiches cuits", kcal: 139, protein: 7, carbs: 19, fats: 2.6, category: "Épicerie" },
  banane: { name: "banane", kcal: 90, protein: 1.1, carbs: 20, fats: 0.3, category: "Fruits & légumes" },
  pomme: { name: "pomme", kcal: 52, protein: 0.3, carbs: 14, fats: 0.2, category: "Fruits & légumes" },
  fruitsRouges: { name: "fruits rouges", kcal: 50, protein: 1, carbs: 12, fats: 0.3, category: "Fruits & légumes", note: "surgelés" },
  brocoli: { name: "brocoli", kcal: 34, protein: 2.8, carbs: 7, fats: 0.4, category: "Fruits & légumes" },
  haricotsVerts: { name: "haricots verts", kcal: 31, protein: 1.8, carbs: 7, fats: 0.1, category: "Fruits & légumes" },
  courgette: { name: "courgette", kcal: 17, protein: 1.2, carbs: 3, fats: 0.3, category: "Fruits & légumes" },
  epinards: { name: "épinards", kcal: 23, protein: 2.9, carbs: 3.6, fats: 0.4, category: "Fruits & légumes" },
  tomate: { name: "tomates", kcal: 18, protein: 0.9, carbs: 3.9, fats: 0.2, category: "Fruits & légumes" },
  crudites: { name: "crudités (salade, carotte, concombre)", kcal: 20, protein: 1, carbs: 4, fats: 0.2, category: "Fruits & légumes" },
  avocat: { name: "avocat", kcal: 160, protein: 2, carbs: 8.5, fats: 14.7, category: "Fruits & légumes" },
  amandes: { name: "amandes", kcal: 579, protein: 21, carbs: 22, fats: 50, category: "Épicerie" },
  beurreCacahuete: { name: "beurre de cacahuète", kcal: 588, protein: 25, carbs: 20, fats: 50, category: "Épicerie" },
  huile: { name: "huile d'olive", kcal: 900, protein: 0, carbs: 0, fats: 100, category: "Épicerie" },
  miel: { name: "miel", kcal: 304, protein: 0.3, carbs: 82, fats: 0, category: "Épicerie" },
} satisfies Record<string, Food>

type FoodKey = keyof typeof FOODS
/** P = source de protéines, C = glucides, F = lipides, V = légumes (quantité fixe). */
type Role = "P" | "C" | "F" | "V"
type MealTemplate = { name: string; ingredients: [FoodKey, number, Role][] }

const BREAKFASTS: MealTemplate[] = [
  { name: "Porridge banane & beurre de cacahuète", ingredients: [["avoine", 70, "C"], ["lait", 250, "P"], ["banane", 100, "C"], ["beurreCacahuete", 15, "F"]] },
  { name: "Œufs brouillés & pain complet", ingredients: [["oeufs", 180, "P"], ["painComplet", 80, "C"], ["tomate", 100, "V"], ["huile", 5, "F"]] },
  { name: "Bol de skyr, flocons & fruits rouges", ingredients: [["skyr", 250, "P"], ["avoine", 50, "C"], ["fruitsRouges", 100, "C"], ["amandes", 15, "F"], ["miel", 10, "C"]] },
  { name: "Tartines avocat & œufs", ingredients: [["painComplet", 80, "C"], ["avocat", 70, "F"], ["oeufs", 120, "P"]] },
]

const LUNCHES: MealTemplate[] = [
  { name: "Poulet, riz basmati & brocoli", ingredients: [["poulet", 150, "P"], ["riz", 80, "C"], ["brocoli", 200, "V"], ["huile", 10, "F"]] },
  { name: "Bœuf haché, patate douce & haricots verts", ingredients: [["steak", 150, "P"], ["patateDouce", 300, "C"], ["haricotsVerts", 200, "V"], ["huile", 10, "F"]] },
  { name: "Saumon, quinoa & courgettes", ingredients: [["saumon", 130, "P"], ["quinoa", 70, "C"], ["courgette", 200, "V"], ["huile", 5, "F"]] },
  { name: "Wraps dinde, crudités & avocat", ingredients: [["tortilla", 120, "C"], ["dinde", 120, "P"], ["crudites", 150, "V"], ["avocat", 50, "F"]] },
  { name: "Salade de lentilles, thon & œuf", ingredients: [["lentilles", 250, "C"], ["thon", 120, "P"], ["oeufs", 60, "P"], ["tomate", 150, "V"], ["huile", 10, "F"]] },
]

const SNACKS: MealTemplate[] = [
  { name: "Fromage blanc, pomme & amandes", ingredients: [["fromageBlanc", 250, "P"], ["pomme", 150, "C"], ["amandes", 15, "F"]] },
  { name: "Skyr, banane & amandes", ingredients: [["skyr", 150, "P"], ["banane", 120, "C"], ["amandes", 20, "F"]] },
  { name: "Tartine beurre de cacahuète & verre de lait", ingredients: [["painComplet", 60, "C"], ["beurreCacahuete", 20, "F"], ["lait", 250, "P"]] },
  { name: "Œufs durs, pois chiches & crudités", ingredients: [["oeufs", 120, "P"], ["poisChiches", 120, "C"], ["crudites", 150, "V"], ["huile", 5, "F"]] },
]

const DINNERS: MealTemplate[] = [
  { name: "Cabillaud, pommes de terre & épinards", ingredients: [["cabillaud", 180, "P"], ["pommeDeTerre", 300, "C"], ["epinards", 200, "V"], ["huile", 10, "F"]] },
  { name: "Omelette aux légumes & pain complet", ingredients: [["oeufs", 180, "P"], ["courgette", 150, "V"], ["epinards", 100, "V"], ["painComplet", 60, "C"], ["huile", 5, "F"]] },
  { name: "Pâtes complètes à la dinde & tomates", ingredients: [["pates", 80, "C"], ["dinde", 130, "P"], ["tomate", 200, "V"], ["huile", 10, "F"]] },
  { name: "Poulet curry, riz & légumes", ingredients: [["poulet", 150, "P"], ["riz", 70, "C"], ["courgette", 150, "V"], ["brocoli", 100, "V"], ["huile", 10, "F"]] },
  { name: "Chili de bœuf aux lentilles", ingredients: [["steak", 130, "P"], ["lentilles", 150, "C"], ["tomate", 200, "V"], ["riz", 40, "C"], ["huile", 5, "F"]] },
]

type PlanSeed = {
  id: string
  name: string
  description: string
  goal: "PRISE_DE_MASSE" | "SECHE" | "MAINTIEN"
  /** Multiplicateur des quantités selon le rôle de l'ingrédient. */
  multipliers: Record<Role, number>
}

const PLANS: PlanSeed[] = [
  {
    id: "nutrition-plan-prise-de-masse",
    name: "Prise de masse",
    description: "Une semaine type en léger surplus : féculents à chaque repas et protéines réparties sur la journée.",
    goal: "PRISE_DE_MASSE",
    multipliers: { P: 1.15, C: 1.7, F: 1.3, V: 1 },
  },
  {
    id: "nutrition-plan-seche",
    name: "Sèche",
    description: "Une semaine type en déficit : beaucoup de protéines et de légumes, féculents réduits pour garder la satiété.",
    goal: "SECHE",
    multipliers: { P: 1.15, C: 0.6, F: 0.7, V: 1.25 },
  },
  {
    id: "nutrition-plan-maintien",
    name: "Maintien",
    description: "Une semaine type équilibrée pour rester au même poids tout en soutenant l'entraînement.",
    goal: "MAINTIEN",
    multipliers: { P: 1.05, C: 1.15, F: 1.1, V: 1 },
  },
]

type BuiltIngredient = { food: Food; grams: number }

function scaleGrams(food: Food, grams: number): number {
  if (typeof food.unit === "object") return Math.max(1, Math.round(grams / food.unit.grams)) * food.unit.grams
  return Math.max(5, Math.round(grams / 5) * 5)
}

function describe({ food, grams }: BuiltIngredient): string {
  const note = food.note ? ` (${food.note})` : ""
  if (typeof food.unit === "object") {
    const n = Math.round(grams / food.unit.grams)
    const label = n > 1 ? `${food.unit.piece}s` : food.unit.piece
    return `${n} ${label}${note}`
  }
  const unit = food.unit === "ml" ? "ml" : "g"
  const de = /^[aeiouyéèêœh]/i.test(food.name) ? "d'" : "de "
  return `${grams} ${unit} ${de}${food.name}${note}`
}

function buildMeal(template: MealTemplate, multipliers: Record<Role, number>) {
  const ingredients: BuiltIngredient[] = template.ingredients.map(([key, grams, role]) => {
    const food: Food = FOODS[key]
    return { food, grams: scaleGrams(food, grams * multipliers[role]) }
  })
  const sum = (field: "kcal" | "protein" | "carbs" | "fats") =>
    ingredients.reduce((total, { food, grams }) => total + (food[field] * grams) / 100, 0)
  return {
    name: template.name,
    description: ingredients.map(describe).join(" · "),
    calories: Math.round(sum("kcal")),
    protein: Math.round(sum("protein") * 10) / 10,
    carbs: Math.round(sum("carbs") * 10) / 10,
    fats: Math.round(sum("fats") * 10) / 10,
    ingredients,
  }
}

function buildPlan(plan: PlanSeed) {
  const days = Array.from({ length: 7 }, (_, i) => ({
    dayNumber: i + 1,
    meals: [
      { type: "PETIT_DEJEUNER" as const, ...buildMeal(BREAKFASTS[i % BREAKFASTS.length], plan.multipliers) },
      { type: "DEJEUNER" as const, ...buildMeal(LUNCHES[i % LUNCHES.length], plan.multipliers) },
      { type: "COLLATION" as const, ...buildMeal(SNACKS[i % SNACKS.length], plan.multipliers) },
      { type: "DINER" as const, ...buildMeal(DINNERS[(i + 2) % DINNERS.length], plan.multipliers) },
    ],
  }))

  // Liste de courses de la semaine : somme des quantités par aliment
  const grocery = new Map<string, { food: Food; grams: number }>()
  for (const day of days) {
    for (const meal of day.meals) {
      for (const { food, grams } of meal.ingredients) {
        const entry = grocery.get(food.name) ?? { food, grams: 0 }
        entry.grams += grams
        grocery.set(food.name, entry)
      }
    }
  }
  const groceryItems = [...grocery.values()].map(({ food, grams }) =>
    typeof food.unit === "object"
      ? { name: food.name, quantity: Math.round(grams / food.unit.grams), unit: "pièce", category: food.category }
      : { name: food.name, quantity: grams, unit: food.unit === "ml" ? "ml" : "g", category: food.category },
  )

  const avg = (field: "calories" | "protein" | "carbs" | "fats") =>
    Math.round(days.reduce((t, d) => t + d.meals.reduce((s, m) => s + m[field], 0), 0) / days.length)

  return {
    days,
    groceryItems,
    dailyCalories: avg("calories"),
    dailyProtein: avg("protein"),
    dailyCarbs: avg("carbs"),
    dailyFats: avg("fats"),
  }
}

export async function seedNutrition(prisma: PrismaClient) {
  console.log("Seeding nutrition plans...")
  for (const plan of PLANS) {
    const existing = await prisma.nutritionPlan.findUnique({ where: { id: plan.id }, select: { id: true } })
    if (existing) continue
    const built = buildPlan(plan)
    await prisma.nutritionPlan.create({
      data: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        goal: plan.goal,
        dailyCalories: built.dailyCalories,
        dailyProtein: built.dailyProtein,
        dailyCarbs: built.dailyCarbs,
        dailyFats: built.dailyFats,
        weeks: {
          create: {
            weekNumber: 1,
            groceryItems: { create: built.groceryItems },
            days: {
              create: built.days.map((day) => ({
                dayNumber: day.dayNumber,
                meals: {
                  create: day.meals.map(({ type, name, description, calories, protein, carbs, fats }) => ({
                    type,
                    name,
                    description,
                    calories,
                    protein,
                    carbs,
                    fats,
                  })),
                },
              })),
            },
          },
        },
      },
    })
    console.log(`  ${plan.name} : ~${built.dailyCalories} kcal/jour (P ${built.dailyProtein} g · G ${built.dailyCarbs} g · L ${built.dailyFats} g)`)
  }
  console.log(`✅ ${PLANS.length} nutrition plans seeded`)
}
