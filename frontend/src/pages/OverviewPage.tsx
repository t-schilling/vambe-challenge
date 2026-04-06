import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts"
import { Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react"
import { useFilters } from "@/contexts/FiltersContext"
import { getOverview, getBySector, getByChannel, getTimeline, generateInsights } from "@/lib/api"
import KPICard from "@/components/dashboard/KPICard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"


interface InsightData {
  hallazgos: string[]
  recomendaciones: string[]
  oportunidades: string[]
  riesgos: string[]
}

export default function OverviewPage() {
  const { apiParams } = useFilters()
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insights, setInsights] = useState<InsightData | null>(null)
  const [insightsError, setInsightsError] = useState<string | null>(null)

  useEffect(() => {
    setInsights(null)
    setInsightsOpen(false)
    setInsightsError(null)
  }, [apiParams])

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["overview", apiParams],
    queryFn: () => getOverview(apiParams),
  })

  const { data: sectors, isLoading: loadingSectors } = useQuery({
    queryKey: ["by-sector", apiParams],
    queryFn: () => getBySector(apiParams),
  })

  const { data: channels, isLoading: loadingChannels } = useQuery({
    queryKey: ["by-channel", apiParams],
    queryFn: () => getByChannel(apiParams),
  })

  const { data: timeline } = useQuery({
    queryKey: ["timeline", apiParams],
    queryFn: () => getTimeline(apiParams),
  })

  async function handleGenerateInsights() {
    if (insights) {
      setInsightsOpen((o) => !o)
      return
    }
    setInsightsLoading(true)
    setInsightsOpen(true)
    setInsightsError(null)
    try {
      const result = await generateInsights({
        overview,
        top_sectors: sectors?.slice(0, 5),
        top_channels: channels?.slice(0, 5),
      })
      setInsights(result)
    } catch {
      setInsightsError("No se pudo generar el análisis. Intenta nuevamente.")
      setInsightsOpen(false)
    } finally {
      setInsightsLoading(false)
    }
  }

  if (loadingOverview) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          title="Total clientes"
          value={overview?.total_clients ?? "—"}
        />
        <KPICard
          title="Tasa de cierre"
          value={overview ? `${overview.close_rate}%` : "—"}
          subtitle={`${overview?.closed_count ?? 0} cerrados`}
        />
        <KPICard
          title="Promedio palabras"
          value={overview ? Math.round(overview.avg_transcript_words).toLocaleString() : "—"}
          subtitle="por transcripción"
        />
        <KPICard
          title="Vendedor top"
          value={overview?.top_vendedor ?? "—"}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Area chart — timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tasa de cierre por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px] lg:h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline ?? []} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCloseRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
                  <Tooltip
                    formatter={(v) => [`${v}%`, "Cierre"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="close_rate"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#colorCloseRate)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bar chart — sector close rate + volume */}
        <Card>
          <CardHeader>
            <CardTitle>Tasa de cierre por sector</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px] lg:h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[...(sectors ?? [])].sort((a, b) => b.close_rate - a.close_rate)}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                  <YAxis type="category" dataKey="sector" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(v, _name, props) => [
                      `${v}% (${props.payload.closed}/${props.payload.total})`,
                      "Cierre",
                    ]}
                  />
                  <Bar dataKey="close_rate" name="Tasa de cierre" radius={[0, 4, 4, 0]}>
                    {(sectors ?? []).map((s: { close_rate: number; sector: string }, i: number) => (
                      <Cell
                        key={i}
                        fill={s.close_rate >= 50 ? "#10b981" : s.close_rate >= 30 ? "#f59e0b" : "#f43f5e"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart — channel conversion */}
      <Card>
        <CardHeader>
          <CardTitle>Conversión por canal de descubrimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[180px] lg:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channels ?? []} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
                <Bar dataKey="total" name="Reuniones" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="closed" name="Cerrados" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Análisis IA</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateInsights}
              disabled={insightsLoading || loadingSectors || loadingChannels}
            >
              {insightsLoading ? (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-3.5" />
              )}
              {insights
                ? insightsOpen ? "Ocultar" : "Mostrar análisis"
                : "Generar Análisis IA"}
              {insights && !insightsLoading && (
                insightsOpen
                  ? <ChevronUp className="ml-2 size-3.5" />
                  : <ChevronDown className="ml-2 size-3.5" />
              )}
            </Button>
          </div>
        </CardHeader>

        {insightsError && (
          <CardContent>
            <p className="text-sm text-rose-600">{insightsError}</p>
          </CardContent>
        )}

        {insightsOpen && (
          <CardContent>
            {insightsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Generando análisis con Gemini…
              </div>
            ) : insights ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <InsightSection title="Hallazgos clave" items={insights.hallazgos} color="text-blue-600" />
                <InsightSection title="Recomendaciones" items={insights.recomendaciones} color="text-emerald-600" />
                <InsightSection title="Oportunidades" items={insights.oportunidades} color="text-amber-600" />
                <InsightSection title="Riesgos" items={insights.riesgos} color="text-rose-600" />
              </div>
            ) : null}
          </CardContent>
        )}
      </Card>
    </div>
  )
}

function InsightSection({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div>
      <h3 className={`mb-2 text-sm font-semibold ${color}`}>{title}</h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="mt-0.5 shrink-0 text-muted-foreground">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
