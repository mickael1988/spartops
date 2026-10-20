import { formatDate } from "@/lib/cardio/format"
import { formatKg } from "@/lib/nutrition/weight"

const WIDTH = 600
const HEIGHT = 180
const PAD_X = 8
const PAD_Y = 14

/** Courbe de poids en SVG pur (rendu serveur, pas de librairie de graphiques). */
export function WeightChart({ points }: { points: { date: Date; weightKg: number }[] }) {
  if (points.length < 2) return null

  const times = points.map((p) => p.date.getTime())
  const weights = points.map((p) => p.weightKg)
  const tMin = Math.min(...times)
  const tMax = Math.max(...times)
  // Au moins 2 kg d'amplitude, sinon 200 g de variation remplissent tout le graphique
  const mid = (Math.min(...weights) + Math.max(...weights)) / 2
  const half = Math.max(1, (Math.max(...weights) - Math.min(...weights)) / 2)
  const wMin = mid - half
  const wMax = mid + half

  const x = (t: number) => PAD_X + ((t - tMin) / Math.max(1, tMax - tMin)) * (WIDTH - 2 * PAD_X)
  const y = (w: number) => PAD_Y + ((wMax - w) / (wMax - wMin)) * (HEIGHT - 2 * PAD_Y)
  const coords = points.map((p) => [x(p.date.getTime()), y(p.weightKg)] as const)
  const line = coords.map(([cx, cy], i) => `${i === 0 ? "M" : "L"}${cx.toFixed(1)},${cy.toFixed(1)}`).join(" ")
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${HEIGHT} L${coords[0][0].toFixed(1)},${HEIGHT} Z`
  const last = coords[coords.length - 1]

  return (
    <figure className="space-y-1">
      <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{formatKg(wMax)}</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Évolution du poids de ${formatKg(weights[0])} à ${formatKg(weights[weights.length - 1])}`}
      >
        <defs>
          <linearGradient id="weight-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#3F5EFB" />
            <stop offset="100%" stopColor="#F50535" />
          </linearGradient>
          <linearGradient id="weight-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3F5EFB" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#3F5EFB" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            x2={WIDTH}
            y1={PAD_Y + f * (HEIGHT - 2 * PAD_Y)}
            y2={PAD_Y + f * (HEIGHT - 2 * PAD_Y)}
            className="stroke-border"
            strokeDasharray="4 6"
          />
        ))}
        <path d={area} fill="url(#weight-area)" />
        <path d={line} fill="none" stroke="url(#weight-line)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {points.length <= 40 &&
          coords.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={3.5} className="fill-background" stroke="#3F5EFB" strokeWidth={2} />)}
        <circle cx={last[0]} cy={last[1]} r={6} fill="#F50535" />
      </svg>
      <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{formatKg(wMin)}</span>
      </div>
      <figcaption className="flex justify-between text-[11px] text-muted-foreground">
        <span>{formatDate(points[0].date, { day: "numeric", month: "short", timeZone: "UTC" })}</span>
        <span>{formatDate(points[points.length - 1].date, { day: "numeric", month: "short", timeZone: "UTC" })}</span>
      </figcaption>
    </figure>
  )
}
