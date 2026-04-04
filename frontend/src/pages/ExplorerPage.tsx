import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ScatterChart, Scatter, ZAxis, Legend,
} from "recharts"
import { Loader2 } from "lucide-react"
import { useFilters } from "@/contexts/FiltersContext"
import { getAllClients } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// ── Types ──────────────────────────────────────────────────────────────────
interface Client {
  id: number
  nombre: string
  fecha_reunion: string | null
  closed: boolean
  transcript_word_count: number | null
  interaction_volume_estimate: number | null
  sector: string | null
  vendedor: string | null
  discovery_channel: string | null
  primary_use_case: string | null
  main_pain_point: string | null
  client_sentiment: string | null
  urgency: string | null
  company_size: string | null
  interaction_volume_tier: string | null
  meeting_depth: string | null
  client_engagement: string | null
}

type ChartType = "bar" | "hbar" | "line" | "scatter"

const DIMENSIONS = [
  { value: "sector", label: "Sector" },
  { value: "vendedor", label: "Vendedor" },
  { value: "discovery_channel", label: "Canal de descubrimiento" },
  { value: "primary_use_case", label: "Use Case" },
  { value: "main_pain_point", label: "Pain Point" },
  { value: "client_sentiment", label: "Sentiment" },
  { value: "urgency", label: "Urgencia" },
  { value: "company_size", label: "Tamaño empresa" },
  { value: "interaction_volume_tier", label: "Volumen tier" },
  { value: "meeting_depth", label: "Meeting depth" },
  { value: "client_engagement", label: "Engagement" },
]

const METRICS = [
  { value: "close_rate", label: "Tasa de cierre (%)", unit: "%" },
  { value: "count", label: "Cantidad de clientes", unit: "" },
  { value: "avg_words", label: "Avg palabras transcripción", unit: "" },
  { value: "avg_volume", label: "Avg volumen estimado", unit: "" },
]

const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e", "#a78bfa", "#34d399", "#fb923c"]

const inputClass = "h-8 rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"

// ── Aggregation helpers ────────────────────────────────────────────────────
function computeMetric(clients: Client[], metric: string): number {
  if (clients.length === 0) return 0
  switch (metric) {
    case "close_rate":
      return Math.round(clients.filter((c) => c.closed).length / clients.length * 100)
    case "count":
      return clients.length
    case "avg_words": {
      const valid = clients.filter((c) => c.transcript_word_count)
      return valid.length > 0 ? Math.round(valid.reduce((s, c) => s + c.transcript_word_count!, 0) / valid.length) : 0
    }
    case "avg_volume": {
      const valid = clients.filter((c) => c.interaction_volume_estimate)
      return valid.length > 0 ? Math.round(valid.reduce((s, c) => s + c.interaction_volume_estimate!, 0) / valid.length) : 0
    }
    default: return 0
  }
}

function getDimValue(c: Client, dim: string): string {
  return ((c as unknown as Record<string, unknown>)[dim] as string) ?? "N/A"
}

function groupClients(clients: Client[], dimension: string): { name: string; clients: Client[] }[] {
  const map = new Map<string, Client[]>()
  for (const c of clients) {
    const key = getDimValue(c, dimension)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(c)
  }
  return Array.from(map.entries())
    .map(([name, clients]) => ({ name, clients }))
    .sort((a, b) => b.clients.length - a.clients.length)
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ExplorerPage() {
  const { apiParams } = useFilters()
  const [chartType, setChartType] = useState<ChartType>("bar")
  const [dimension, setDimension] = useState("sector")
  const [metric, setMetric] = useState("close_rate")
  const [scatterX, setScatterX] = useState("count")
  const [scatterY, setScatterY] = useState("close_rate")
  const [colorBy, setColorBy] = useState("")
  const [splitBy, setSplitBy] = useState("")

  const { data: clients, isLoading } = useQuery({
    queryKey: ["all-clients", apiParams],
    queryFn: () => getAllClients(apiParams),
  })

  const allClients: Client[] = clients ?? []

  const metricUnit = METRICS.find((m) => m.value === metric)?.unit ?? ""
  const scatterXUnit = METRICS.find((m) => m.value === scatterX)?.unit ?? ""
  const scatterYUnit = METRICS.find((m) => m.value === scatterY)?.unit ?? ""

  // Bar / HBar data
  const barData = useMemo(() => {
    return groupClients(allClients, dimension).map(({ name, clients }) => ({
      name,
      value: computeMetric(clients, metric),
    }))
  }, [allClients, dimension, metric])

  // Unique values for the split-by dimension — used by both lineData pivot and Line renders
  const splitByValues = useMemo(() => {
    if (!splitBy) return []
    return [...new Set(allClients.map((c) => getDimValue(c, splitBy)))]
  }, [allClients, splitBy])

  // Line data: group by month, optionally split by dimension
  const lineData = useMemo(() => {
    const monthMap = new Map<string, Client[]>()
    for (const c of allClients) {
      if (!c.fecha_reunion) continue
      const month = c.fecha_reunion.slice(0, 7)
      if (!monthMap.has(month)) monthMap.set(month, [])
      monthMap.get(month)!.push(c)
    }
    const months = Array.from(monthMap.keys()).sort()

    if (!splitBy) {
      return months.map((month) => ({
        month,
        value: computeMetric(monthMap.get(month)!, metric),
      }))
    }

    // Pivot: one column per split-by value (reuse splitByValues)
    return months.map((month) => {
      const row: Record<string, unknown> = { month }
      const monthClients = monthMap.get(month)!
      for (const dv of splitByValues) {
        const subset = monthClients.filter((c) => getDimValue(c, splitBy) === dv)
        row[dv] = computeMetric(subset, metric)
      }
      return row
    })
  }, [allClients, metric, splitBy, splitByValues])

  type ScatterPoint = { name: string; x: number; y: number; colorGroup?: string }
  type ScatterGroup = { color: string; label: string; data: ScatterPoint[] }

  // Scatter data: when colorBy is set, cross-group by (dimension × colorBy) so each point
  // represents a real (dim, colorBy) pair — not an arbitrary clients[0] lookup.
  const scatterGroups = useMemo((): ScatterGroup[] => {
    if (!colorBy) {
      const data = groupClients(allClients, dimension).map(({ name, clients }) => ({
        name,
        x: computeMetric(clients, scatterX),
        y: computeMetric(clients, scatterY),
      }))
      return [{ color: COLORS[0], label: "", data }]
    }

    // Cross-group: one point per (dimension × colorBy) pair
    const crossMap = new Map<string, { dimVal: string; colorVal: string; clients: Client[] }>()
    for (const c of allClients) {
      const dimVal = getDimValue(c, dimension)
      const colorVal = getDimValue(c, colorBy)
      const key = `${dimVal}||${colorVal}`
      if (!crossMap.has(key)) crossMap.set(key, { dimVal, colorVal, clients: [] })
      crossMap.get(key)!.clients.push(c)
    }

    // Group points by colorBy value for separate Scatter components
    const byColor = new Map<string, ScatterPoint[]>()
    for (const { dimVal, colorVal, clients } of crossMap.values()) {
      if (!byColor.has(colorVal)) byColor.set(colorVal, [])
      byColor.get(colorVal)!.push({
        name: `${dimVal} / ${colorVal}`,
        x: computeMetric(clients, scatterX),
        y: computeMetric(clients, scatterY),
        colorGroup: colorVal,
      })
    }

    return Array.from(byColor.entries()).map(([label, data], i) => ({
      color: COLORS[i % COLORS.length],
      label,
      data,
    }))
  }, [allClients, dimension, colorBy, scatterX, scatterY])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Explorador Ad-Hoc</h1>

      {/* Controls */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Chart type */}
            <select className={inputClass} value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)}>
              <option value="bar">Bar vertical</option>
              <option value="hbar">Bar horizontal</option>
              <option value="line">Línea temporal</option>
              <option value="scatter">Scatter</option>
            </select>

            {chartType !== "scatter" && (
              <>
                <select className={inputClass} value={dimension} onChange={(e) => setDimension(e.target.value)}>
                  {DIMENSIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <select className={inputClass} value={metric} onChange={(e) => setMetric(e.target.value)}>
                  {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                {chartType === "line" && (
                  <select className={inputClass} value={splitBy} onChange={(e) => setSplitBy(e.target.value)}>
                    <option value="">Sin split</option>
                    {DIMENSIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                )}
              </>
            )}

            {chartType === "scatter" && (
              <>
                <select className={inputClass} value={dimension} onChange={(e) => setDimension(e.target.value)}>
                  <option value="" disabled>Agrupar por</option>
                  {DIMENSIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <select className={inputClass} value={scatterX} onChange={(e) => setScatterX(e.target.value)}>
                  {METRICS.map((m) => <option key={m.value} value={m.value}>X: {m.label}</option>)}
                </select>
                <select className={inputClass} value={scatterY} onChange={(e) => setScatterY(e.target.value)}>
                  {METRICS.map((m) => <option key={m.value} value={m.value}>Y: {m.label}</option>)}
                </select>
                <select className={inputClass} value={colorBy} onChange={(e) => setColorBy(e.target.value)}>
                  <option value="">Sin color</option>
                  {DIMENSIONS.filter((d) => d.value !== dimension).map((d) => (
                    <option key={d.value} value={d.value}>Color: {d.label}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {chartType === "scatter"
              ? `${METRICS.find(m => m.value === scatterX)?.label} vs ${METRICS.find(m => m.value === scatterY)?.label} por ${DIMENSIONS.find(d => d.value === dimension)?.label}`
              : `${METRICS.find(m => m.value === metric)?.label} por ${chartType === "line" ? "mes" : DIMENSIONS.find(d => d.value === dimension)?.label}`
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {(chartType === "bar") && (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={barData} margin={{ top: 4, right: 16, left: -8, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 12 }} unit={metricUnit} />
                    <Tooltip formatter={(v) => [`${v}${metricUnit}`, "Valor"]} contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {chartType === "hbar" && (
                <ResponsiveContainer width="100%" height={Math.max(280, barData.length * 36)}>
                  <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} unit={metricUnit} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={130} />
                    <Tooltip formatter={(v) => [`${v}${metricUnit}`, "Valor"]} contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {chartType === "line" && (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={lineData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} unit={metricUnit} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    {splitBy && splitByValues.length > 0 ? (
                      <>
                        <Legend iconSize={10} />
                        {splitByValues.map((v, i) => (
                          <Line key={v} type="monotone" dataKey={v} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                        ))}
                      </>
                    ) : (
                      <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}

              {chartType === "scatter" && (
                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="x" type="number" name={METRICS.find(m => m.value === scatterX)?.label} tick={{ fontSize: 12 }} unit={scatterXUnit} />
                    <YAxis dataKey="y" type="number" name={METRICS.find(m => m.value === scatterY)?.label} tick={{ fontSize: 12 }} unit={scatterYUnit} />
                    <ZAxis range={[60, 60]} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{ fontSize: 12 }}
                      content={({ payload }) => {
                        if (!payload?.length) return null
                        const d = payload[0].payload
                        return (
                          <div className="rounded-lg border bg-popover p-2 text-xs shadow">
                            <p className="font-medium">{d.name}</p>
                            <p>{METRICS.find(m => m.value === scatterX)?.label}: {d.x}{scatterXUnit}</p>
                            <p>{METRICS.find(m => m.value === scatterY)?.label}: {d.y}{scatterYUnit}</p>
                            {d.color && <p>Color: {d.color}</p>}
                          </div>
                        )
                      }}
                    />
                    {colorBy ? (
                      <>
                        <Legend iconSize={10} />
                        {scatterGroups.map((g) => (
                          <Scatter key={g.label} name={g.label} data={g.data} fill={g.color} />
                        ))}
                      </>
                    ) : (
                      <Scatter data={scatterGroups[0].data} fill="#6366f1" />
                    )}
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
