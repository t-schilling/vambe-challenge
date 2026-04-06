interface SalespersonRow {
  vendedor: string
  total: number
  closed: number
  close_rate: number
  avg_words: number
  meeting_depth_distribution: Record<string, number>
}

import { useQuery } from "@tanstack/react-query"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Loader2 } from "lucide-react"
import { useFilters } from "@/contexts/FiltersContext"
import { getBySalesperson, getByMeetingDepth } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const DEPTH_COLORS: Record<string, string> = {
  superficial: "#f59e0b",
  moderate: "#6366f1",
  deep: "#10b981",
}

const ENGAGEMENT_COLORS: Record<string, string> = {
  low: "#f43f5e",
  medium: "#f59e0b",
  high: "#10b981",
}

export default function SalespersonPage() {
  const { apiParams } = useFilters()

  const { data: salespersons, isLoading } = useQuery({
    queryKey: ["by-salesperson", apiParams],
    queryFn: () => getBySalesperson(apiParams),
  })

  const { data: meetingDepthData } = useQuery({
    queryKey: ["by-meeting-depth", apiParams],
    queryFn: () => getByMeetingDepth(apiParams),
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const rows: SalespersonRow[] = salespersons ?? []

  const rowsWithPct = rows.map((r) => ({
    ...r,
    pctDeep: r.total > 0 ? Math.round((r.meeting_depth_distribution?.deep ?? 0) / r.total * 100) : 0,
  }))

  // Bar chart data: avg words per salesperson
  const avgWordsData = rows.map((r) => ({
    vendedor: r.vendedor,
    palabras: r.avg_words,
  }))

  // Stacked bar: meeting_depth distribution per vendedor
  const depthData = rows.map((r) => ({
    vendedor: r.vendedor,
    superficial: r.meeting_depth_distribution?.superficial ?? 0,
    moderate: r.meeting_depth_distribution?.moderate ?? 0,
    deep: r.meeting_depth_distribution?.deep ?? 0,
  }))

  // Grouped bar: close rate by meeting_depth + client_engagement
  const depthEngagementMap: Record<string, Record<string, number>> = {}
  for (const item of meetingDepthData ?? []) {
    const key = item.meeting_depth
    if (!depthEngagementMap[key]) depthEngagementMap[key] = {}
    depthEngagementMap[key][item.client_engagement ?? "unknown"] = item.close_rate
  }
  const depthEngagementData = Object.entries(depthEngagementMap).map(([depth, engMap]) => ({
    depth,
    low: engMap.low ?? 0,
    medium: engMap.medium ?? 0,
    high: engMap.high ?? 0,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Vendedores</h1>

      {/* Comparative table */}
      <Card>
        <CardHeader>
          <CardTitle>Tabla comparativa</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile: card view */}
          <div className="divide-y lg:hidden">
            {rowsWithPct.map((r) => (
              <div key={r.vendedor} className="py-3">
                <p className="font-medium">{r.vendedor}</p>
                <div className="mt-1.5 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Reuniones</p>
                    <p className="font-medium">{r.total}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tasa cierre</p>
                    <p className={`font-medium ${r.close_rate >= 50 ? "text-emerald-600" : r.close_rate >= 30 ? "text-amber-600" : "text-rose-600"}`}>
                      {r.close_rate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">% Deep</p>
                    <p className="font-medium">{r.pctDeep}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Vendedor</th>
                  <th className="pb-2 pr-4 font-medium text-right">Reuniones</th>
                  <th className="pb-2 pr-4 font-medium text-right">Cerrados</th>
                  <th className="pb-2 pr-4 font-medium text-right">Tasa cierre</th>
                  <th className="pb-2 pr-4 font-medium text-right">Avg palabras</th>
                  <th className="pb-2 pr-4 font-medium text-right">% Deep</th>
                </tr>
              </thead>
              <tbody>
                {rowsWithPct.map((r) => (
                  <tr key={r.vendedor} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{r.vendedor}</td>
                    <td className="py-2.5 pr-4 text-right">{r.total}</td>
                    <td className="py-2.5 pr-4 text-right">{r.closed}</td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className={r.close_rate >= 50 ? "text-emerald-600 font-medium" : r.close_rate >= 30 ? "text-amber-600" : "text-rose-600"}>
                        {r.close_rate}%
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right">{r.avg_words.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right">{r.pctDeep}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Avg words per salesperson */}
        <Card>
          <CardHeader>
            <CardTitle>Promedio de palabras por vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={avgWordsData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="vendedor" tick={{ fontSize: 12 }} width={56} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="palabras" name="Avg palabras" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Meeting depth distribution — stacked bar */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de profundidad de reunión</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={depthData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="vendedor" tick={{ fontSize: 12 }} width={56} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
                <Bar dataKey="superficial" name="Superficial" stackId="a" fill={DEPTH_COLORS.superficial} />
                <Bar dataKey="moderate" name="Moderate" stackId="a" fill={DEPTH_COLORS.moderate} />
                <Bar dataKey="deep" name="Deep" stackId="a" fill={DEPTH_COLORS.deep} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Close rate by meeting_depth + client_engagement */}
      <Card>
        <CardHeader>
          <CardTitle>Tasa de cierre por profundidad de reunión y engagement del cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={depthEngagementData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="depth" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
              <Tooltip
                formatter={(v) => [`${v}%`, ""]}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
              <Bar dataKey="low" name="Engagement bajo" fill={ENGAGEMENT_COLORS.low} radius={[4, 4, 0, 0]} />
              <Bar dataKey="medium" name="Engagement medio" fill={ENGAGEMENT_COLORS.medium} radius={[4, 4, 0, 0]} />
              <Bar dataKey="high" name="Engagement alto" fill={ENGAGEMENT_COLORS.high} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
