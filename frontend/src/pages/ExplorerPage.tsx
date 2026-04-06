import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ScatterChart, Scatter, ZAxis, Legend, Cell,
} from "recharts"
import { Loader2, Settings2 } from "lucide-react"
import { useFilters } from "@/contexts/FiltersContext"
import { getAllClients, getCross } from "@/lib/api"
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

type ChartType = "bar" | "hbar" | "line" | "scatter" | "matrix"

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

function matrixColor(value: number, metric: string, maxCount: number): string {
  if (metric === "close_rate") {
    if (value >= 50) return "bg-emerald-100 text-emerald-800"
    if (value >= 30) return "bg-amber-100 text-amber-800"
    return "bg-rose-100 text-rose-800"
  }
  // count: shade by relative value
  const pct = maxCount > 0 ? value / maxCount : 0
  if (pct >= 0.6) return "bg-indigo-100 text-indigo-800"
  if (pct >= 0.3) return "bg-indigo-50 text-indigo-700"
  return "bg-muted text-muted-foreground"
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
  const [stackBy, setStackBy] = useState("")
  const [controlsOpen, setControlsOpen] = useState(false)

  const { data: clients, isLoading } = useQuery({
    queryKey: ["all-clients", apiParams],
    queryFn: () => getAllClients(apiParams),
  })

  // Cross endpoint — only used for matrix chart type
  const { data: crossData, isLoading: loadingCross } = useQuery({
    queryKey: ["cross", dimension, stackBy, apiParams],
    queryFn: () => getCross(dimension, stackBy, apiParams),
    enabled: chartType === "matrix" && !!stackBy && stackBy !== dimension,
  })

  const allClients: Client[] = clients ?? []

  const metricUnit = METRICS.find((m) => m.value === metric)?.unit ?? ""
  const scatterXUnit = METRICS.find((m) => m.value === scatterX)?.unit ?? ""
  const scatterYUnit = METRICS.find((m) => m.value === scatterY)?.unit ?? ""

  // Bar / HBar data (simple)
  const barData = useMemo(() => {
    return groupClients(allClients, dimension).map(({ name, clients }) => ({
      name,
      value: computeMetric(clients, metric),
    }))
  }, [allClients, dimension, metric])

  // Stacked bar — unique values of stackBy dimension
  const stackByValues = useMemo(() => {
    if (!stackBy) return []
    return [...new Set(allClients.map((c) => getDimValue(c, stackBy)))].sort()
  }, [allClients, stackBy])

  // Stacked bar data: rows = dimension values, cols = stackBy values
  const stackedData = useMemo(() => {
    if (!stackBy) return []
    return groupClients(allClients, dimension).map(({ name, clients }) => {
      const row: Record<string, unknown> = { name }
      for (const sv of stackByValues) {
        row[sv] = computeMetric(clients.filter((c) => getDimValue(c, stackBy) === sv), metric)
      }
      return row
    })
  }, [allClients, dimension, stackBy, stackByValues, metric])

  // Line data: group by month, optionally split by dimension
  const splitByValues = useMemo(() => {
    if (!splitBy) return []
    return [...new Set(allClients.map((c) => getDimValue(c, splitBy)))]
  }, [allClients, splitBy])

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

  // Matrix derived from cross endpoint
  const matrixRows = useMemo(
    () => [...new Set((crossData ?? []).map((r: Record<string, unknown>) => String(r.dim1_value)))].sort(),
    [crossData]
  )
  const matrixCols = useMemo(
    () => [...new Set((crossData ?? []).map((r: Record<string, unknown>) => String(r.dim2_value)))].sort(),
    [crossData]
  )
  const matrixMap = useMemo(() => {
    const map = new Map<string, Map<string, { total: number; close_rate: number }>>()
    for (const r of (crossData ?? []) as Record<string, unknown>[]) {
      const row = String(r.dim1_value)
      const col = String(r.dim2_value)
      if (!map.has(row)) map.set(row, new Map())
      map.get(row)!.set(col, { total: Number(r.total), close_rate: Number(r.close_rate) })
    }
    return map
  }, [crossData])
  const matrixMaxCount = useMemo(
    () => Math.max(0, ...(crossData ?? []).map((r: Record<string, unknown>) => Number(r.total))),
    [crossData]
  )

  type ScatterPoint = { name: string; x: number; y: number; colorGroup?: string }
  type ScatterGroup = { color: string; label: string; data: ScatterPoint[] }

  const scatterGroups = useMemo((): ScatterGroup[] => {
    if (!colorBy) {
      const data = groupClients(allClients, dimension).map(({ name, clients }) => ({
        name,
        x: computeMetric(clients, scatterX),
        y: computeMetric(clients, scatterY),
      }))
      return [{ color: COLORS[0], label: "", data }]
    }

    const crossMap = new Map<string, { dimVal: string; colorVal: string; clients: Client[] }>()
    for (const c of allClients) {
      const dimVal = getDimValue(c, dimension)
      const colorVal = getDimValue(c, colorBy)
      const key = `${dimVal}||${colorVal}`
      if (!crossMap.has(key)) crossMap.set(key, { dimVal, colorVal, clients: [] })
      crossMap.get(key)!.clients.push(c)
    }

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

  const isStacked = (chartType === "bar" || chartType === "hbar") && !!stackBy && stackBy !== dimension
  const dimLabel = DIMENSIONS.find((d) => d.value === dimension)?.label ?? dimension
  const stackLabel = DIMENSIONS.find((d) => d.value === stackBy)?.label ?? stackBy
  const metricLabel = METRICS.find((m) => m.value === metric)?.label ?? metric

  const chartTitle = chartType === "scatter"
    ? `${METRICS.find(m => m.value === scatterX)?.label} vs ${METRICS.find(m => m.value === scatterY)?.label} por ${dimLabel}`
    : chartType === "matrix"
      ? `Tasa de cierre: ${dimLabel} × ${stackLabel}`
      : isStacked
        ? `${metricLabel} por ${dimLabel} (apilado por ${stackLabel})`
        : `${metricLabel} por ${chartType === "line" ? "mes" : dimLabel}`

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Explorador Ad-Hoc</h1>

      {/* Controls */}
      <Card>
        <CardContent className="pt-4">
          <button
            type="button"
            aria-expanded={controlsOpen}
            onClick={() => setControlsOpen((o) => !o)}
            className="mb-3 flex items-center gap-2 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent lg:hidden"
          >
            <Settings2 className="size-4" />
            {controlsOpen ? "Ocultar configuración" : "Configurar gráfico"}
          </button>

          <div className={`gap-3 ${controlsOpen ? "flex flex-col" : "hidden"} lg:flex lg:flex-row lg:flex-wrap lg:items-center`}>
            {/* Chart type */}
            <select className={inputClass} value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)}>
              <option value="bar">Bar vertical</option>
              <option value="hbar">Bar horizontal</option>
              <option value="line">Línea temporal</option>
              <option value="scatter">Scatter</option>
              <option value="matrix">Matriz</option>
            </select>

            {chartType !== "scatter" && (
              <>
                <select className={inputClass} value={dimension} onChange={(e) => setDimension(e.target.value)}>
                  {DIMENSIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <select className={inputClass} value={metric} onChange={(e) => setMetric(e.target.value)}>
                  {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </>
            )}

            {/* Line: split by */}
            {chartType === "line" && (
              <select className={inputClass} value={splitBy} onChange={(e) => setSplitBy(e.target.value)}>
                <option value="">Sin split</option>
                {DIMENSIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            )}

            {/* Bar / HBar / Matrix: secondary dimension */}
            {(chartType === "bar" || chartType === "hbar" || chartType === "matrix") && (
              <select className={inputClass} value={stackBy} onChange={(e) => setStackBy(e.target.value)}>
                <option value="">
                  {chartType === "matrix" ? "— Selecciona dimensión secundaria —" : "Sin apilado"}
                </option>
                {DIMENSIONS.filter((d) => d.value !== dimension).map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            )}

            {/* Scatter */}
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
          <CardTitle className="text-sm font-medium text-muted-foreground">{chartTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Simple bar */}
              {chartType === "bar" && !isStacked && (
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

              {/* Stacked bar vertical */}
              {chartType === "bar" && isStacked && (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={stackedData} margin={{ top: 4, right: 16, left: -8, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 12 }} unit={metricUnit} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                    {stackByValues.map((sv, i) => (
                      <Bar key={sv} dataKey={sv} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === stackByValues.length - 1 ? [4, 4, 0, 0] : undefined} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Simple hbar */}
              {chartType === "hbar" && !isStacked && (
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

              {/* Stacked hbar */}
              {chartType === "hbar" && isStacked && (
                <ResponsiveContainer width="100%" height={Math.max(280, stackedData.length * 36)}>
                  <BarChart data={stackedData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} unit={metricUnit} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={130} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                    {stackByValues.map((sv, i) => (
                      <Bar key={sv} dataKey={sv} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === stackByValues.length - 1 ? [0, 4, 4, 0] : undefined} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Line */}
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

              {/* Scatter */}
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

              {/* Matrix */}
              {chartType === "matrix" && (
                !stackBy || stackBy === dimension ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Selecciona una dimensión secundaria para ver la matriz.
                  </p>
                ) : loadingCross ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="pb-1 pr-3 text-left font-medium text-muted-foreground">{dimLabel}</th>
                          {matrixCols.map((col) => (
                            <th key={col} className="pb-1 px-1 text-center font-medium text-muted-foreground whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {matrixRows.map((row) => (
                          <tr key={row}>
                            <td className="py-0.5 pr-3 font-medium whitespace-nowrap">{row}</td>
                            {matrixCols.map((col) => {
                              const cell = matrixMap.get(row)?.get(col)
                              return (
                                <td key={col} className="py-0.5 px-1 text-center">
                                  {cell ? (
                                    <span
                                      title={`n=${cell.total}`}
                                      className={`inline-block rounded px-1 py-0.5 ${matrixColor(cell.close_rate, metric, matrixMaxCount)} ${cell.total < 3 ? "opacity-50" : ""}`}
                                    >
                                      {cell.close_rate}%
                                      <span className="block text-[10px] opacity-70">n={cell.total}</span>
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/30">—</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
