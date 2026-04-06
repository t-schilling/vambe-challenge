import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Loader2 } from "lucide-react"
import { useFilters } from "@/contexts/FiltersContext"
import {
  getBySector,
  getByVolume,
  getByUseCase,
  getByPainPoint,
  getByIntegrationNeeds,
  getByCompanySize,
  getSectorByChannel,
  getUsecaseByCompanySize,
  getCompanySizeByChannel,
} from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const LOW_SAMPLE = 3

const COMPANY_ORDER = ["startup", "small", "medium", "large"]

const CROSS_COLORS = [
  "#6366f1", "#22d3ee", "#f59e0b", "#10b981",
  "#f43f5e", "#a78bfa", "#34d399", "#fb923c",
]

// Build stacked bar data: rows indexed by rowKey, columns = unique values of colKey
function buildStackedData<T extends Record<string, unknown>>(
  data: T[],
  rowKey: keyof T,
  colKey: keyof T,
  valueKey: keyof T,
  rowOrder?: string[],
): { row: string; [col: string]: number | string }[] {
  const cols = [...new Set(data.map((d) => String(d[colKey])))]
  const rowMap: Record<string, Record<string, number>> = {}
  for (const d of data) {
    const row = String(d[rowKey])
    if (!rowMap[row]) rowMap[row] = {}
    rowMap[row][String(d[colKey])] = Number(d[valueKey])
  }
  const rows = rowOrder
    ? rowOrder.filter((r) => rowMap[r])
    : [...new Set(data.map((d) => String(d[rowKey])))]
  return rows.map((row) => ({
    row,
    ...Object.fromEntries(cols.map((col) => [col, rowMap[row]?.[col] ?? 0])),
  }))
}

// Build heatmap cells: Map<rowKey, Map<colKey, {total, close_rate}>>
function buildHeatmap<T extends Record<string, unknown>>(
  data: T[],
  rowKey: keyof T,
  colKey: keyof T,
): Map<string, Map<string, { total: number; close_rate: number }>> {
  const map = new Map<string, Map<string, { total: number; close_rate: number }>>()
  for (const d of data) {
    const row = String(d[rowKey])
    const col = String(d[colKey])
    if (!map.has(row)) map.set(row, new Map())
    map.get(row)!.set(col, { total: Number(d.total), close_rate: Number(d.close_rate) })
  }
  return map
}

function heatmapColor(closeRate: number): string {
  if (closeRate >= 50) return "bg-emerald-100 text-emerald-800"
  if (closeRate >= 30) return "bg-amber-100 text-amber-800"
  return "bg-rose-100 text-rose-800"
}

interface HeatmapMatrixProps {
  data: Record<string, unknown>[]
  rowKey: string
  colKey: string
  rowLabel: string
  rowOrder?: string[]
  colOrder?: string[]
}

function HeatmapMatrix({ data, rowKey, colKey, rowLabel, rowOrder, colOrder }: HeatmapMatrixProps) {
  const rows = rowOrder ?? [...new Set(data.map((d) => String(d[rowKey])))]
  const cols = colOrder ?? [...new Set(data.map((d) => String(d[colKey])))]
  const heatmap = buildHeatmap(data as Record<string, unknown>[], rowKey, colKey)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="pb-1 pr-2 text-left font-medium text-muted-foreground">{rowLabel}</th>
            {cols.map((col) => (
              <th key={col} className="pb-1 px-1 text-center font-medium text-muted-foreground whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <td className="py-0.5 pr-2 font-medium whitespace-nowrap">{row}</td>
              {cols.map((col) => {
                const cell = heatmap.get(row)?.get(col)
                return (
                  <td key={col} className="py-0.5 px-1 text-center">
                    {cell ? (
                      <span className={`inline-block rounded px-1 py-0.5 ${heatmapColor(cell.close_rate)} ${cell.total < LOW_SAMPLE ? "opacity-50" : ""}`}>
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
}

function sampleTooltip(value: unknown, label: unknown, total: unknown, unit = ""): [string, string] {
  const n = Number(total)
  const warning = !isNaN(n) && n < LOW_SAMPLE ? " ⚠ muestra pequeña" : ""
  const nStr = !isNaN(n) ? ` (n=${n})` : ""
  return [`${value}${unit}${nStr}${warning}`, String(label)]
}

function HorizontalBar({
  data,
  dataKey,
  nameKey,
  valueKey = "total",
  totalKey,
  color = "#6366f1",
  unit = "",
}: {
  data: Record<string, unknown>[]
  dataKey: string
  nameKey: string
  valueKey?: string
  totalKey?: string
  color?: string
  unit?: string
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12 }} unit={unit} />
        <YAxis type="category" dataKey={nameKey} tick={{ fontSize: 11 }} width={90} />
        <Tooltip
          contentStyle={{ fontSize: 12 }}
          formatter={(v, _name, props) =>
            sampleTooltip(v, dataKey, totalKey ? props.payload[totalKey] : undefined, unit)
          }
        />
        <Bar dataKey={valueKey} name={dataKey} radius={[0, 4, 4, 0]}>
          {data.map((row, i) => {
            const n = totalKey ? Number(row[totalKey]) : Infinity
            return <Cell key={i} fill={color} opacity={!isNaN(n) && n < LOW_SAMPLE ? 0.4 : 1} />
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function MarketPage() {
  const { apiParams } = useFilters()

  const { data: sectors, isLoading } = useQuery({
    queryKey: ["by-sector", apiParams],
    queryFn: () => getBySector(apiParams),
  })

  const { data: volumes } = useQuery({
    queryKey: ["by-volume", apiParams],
    queryFn: () => getByVolume(apiParams),
  })

  const { data: useCases } = useQuery({
    queryKey: ["by-use-case", apiParams],
    queryFn: () => getByUseCase(apiParams),
  })

  const { data: painPoints } = useQuery({
    queryKey: ["by-pain-point", apiParams],
    queryFn: () => getByPainPoint(apiParams),
  })

  const { data: integrationNeeds } = useQuery({
    queryKey: ["by-integration-needs", apiParams],
    queryFn: () => getByIntegrationNeeds(apiParams),
  })

  const { data: companySizes } = useQuery({
    queryKey: ["by-company-size", apiParams],
    queryFn: () => getByCompanySize(apiParams),
  })

  const { data: sectorByChannel } = useQuery({
    queryKey: ["sector-by-channel", apiParams],
    queryFn: () => getSectorByChannel(apiParams),
  })

  const { data: usecaseByCompanySize } = useQuery({
    queryKey: ["usecase-by-companysize", apiParams],
    queryFn: () => getUsecaseByCompanySize(apiParams),
  })

  const { data: companySizeByChannel } = useQuery({
    queryKey: ["companysize-by-channel", apiParams],
    queryFn: () => getCompanySizeByChannel(apiParams),
  })

  // Cross-analysis — sector × channel
  const sectorChannelRaw: Record<string, unknown>[] = sectorByChannel ?? []
  const uniqueChannels = useMemo(
    () => [...new Set(sectorChannelRaw.map((d) => String(d.channel)))].sort(),
    [sectorByChannel]
  )
  const uniqueSectors = useMemo(
    () => [...new Set(sectorChannelRaw.map((d) => String(d.sector)))].sort(),
    [sectorByChannel]
  )
  const sectorChannelStacked = useMemo(
    () => buildStackedData(sectorChannelRaw, "sector", "channel", "total", uniqueSectors),
    [sectorByChannel, uniqueSectors]
  )

  // Cross-analysis — use case × company size
  const usecaseSizeRaw: Record<string, unknown>[] = usecaseByCompanySize ?? []
  const uniqueUseCases = useMemo(
    () => [...new Set(usecaseSizeRaw.map((d) => String(d.use_case)))].sort(),
    [usecaseByCompanySize]
  )
  const usecaseSizeStacked = useMemo(
    () => buildStackedData(usecaseSizeRaw, "company_size", "use_case", "total", COMPANY_ORDER),
    [usecaseByCompanySize]
  )

  // Cross-analysis — company size × channel
  const sizeChannelRaw: Record<string, unknown>[] = companySizeByChannel ?? []
  const uniqueChannelsBySize = useMemo(
    () => [...new Set(sizeChannelRaw.map((d) => String(d.channel)))].sort(),
    [companySizeByChannel]
  )
  const sizeChannelStacked = useMemo(
    () => buildStackedData(sizeChannelRaw, "company_size", "channel", "total", COMPANY_ORDER),
    [companySizeByChannel]
  )

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const sectorData = (sectors ?? []).map((r: Record<string, unknown>) => ({
    sector: r.sector,
    "Tasa cierre": r.close_rate,
    total: r.total,
  }))

  // Backend already returns sorted by VOLUME_ORDER
  const volumeData = (volumes ?? []).map((r: Record<string, unknown>) => ({
    tier: r.tier,
    "Tasa cierre": r.close_rate,
    total: r.total,
  }))

  // Backend already returns sorted by COMPANY_ORDER
  const companySizeData = (companySizes ?? []).map((r: Record<string, unknown>) => ({
    company_size: r.company_size,
    "Tasa cierre": r.close_rate,
    total: r.total,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mercado & Producto</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Tasa de cierre por sector */}
        <Card>
          <CardHeader>
            <CardTitle>Tasa de cierre por sector</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBar
              data={sectorData}
              dataKey="Tasa cierre"
              nameKey="sector"
              valueKey="Tasa cierre"
              totalKey="total"
              color="#6366f1"
              unit="%"
            />
          </CardContent>
        </Card>

        {/* Tasa de cierre por tier de volumen */}
        <Card>
          <CardHeader>
            <CardTitle>Tasa de cierre por volumen de interacciones</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={volumeData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="tier" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(v, n, props) => sampleTooltip(v, n, props.payload.total, "%")}
                />
                <Bar dataKey="Tasa cierre" radius={[4, 4, 0, 0]}>
                  {volumeData.map((row: { total: number }, i: number) => (
                    <Cell key={i} fill="#6366f1" opacity={Number(row.total) < LOW_SAMPLE ? 0.4 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pain points más frecuentes */}
        <Card>
          <CardHeader>
            <CardTitle>Pain points más frecuentes</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBar
              data={(painPoints ?? []).map((r: Record<string, unknown>) => ({
                pain_point: r.pain_point,
                total: r.total,
              }))}
              dataKey="Casos"
              nameKey="pain_point"
              valueKey="total"
              color="#f59e0b"
            />
          </CardContent>
        </Card>

        {/* Casos de uso más pedidos */}
        <Card>
          <CardHeader>
            <CardTitle>Casos de uso más pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBar
              data={(useCases ?? []).map((r: Record<string, unknown>) => ({
                use_case: r.use_case,
                total: r.total,
              }))}
              dataKey="Reuniones"
              nameKey="use_case"
              valueKey="total"
              color="#10b981"
            />
          </CardContent>
        </Card>

        {/* Integration needs */}
        <Card>
          <CardHeader>
            <CardTitle>Necesidades de integración</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBar
              data={(integrationNeeds ?? []).map((r: Record<string, unknown>) => ({
                need: r.need,
                total: r.total,
              }))}
              dataKey="Menciones"
              nameKey="need"
              valueKey="total"
              color="#a78bfa"
            />
          </CardContent>
        </Card>

        {/* Tasa de cierre por tamaño de empresa */}
        <Card>
          <CardHeader>
            <CardTitle>Tasa de cierre por tamaño de empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={companySizeData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="company_size" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(v, n, props) => sampleTooltip(v, n, props.payload.total, "%")}
                />
                <Bar dataKey="Tasa cierre" radius={[4, 4, 0, 0]}>
                  {companySizeData.map((row: { total: number }, i: number) => (
                    <Cell key={i} fill="#6366f1" opacity={Number(row.total) < LOW_SAMPLE ? 0.4 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cross analysis section */}
      <h2 className="text-lg font-semibold pt-2">Análisis cruzado</h2>

      {/* Sector × Canal */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Canales por sector</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, sectorChannelStacked.length * 36)}>
              <BarChart data={sectorChannelStacked} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="row" tick={{ fontSize: 11 }} width={90} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                {uniqueChannels.map((ch, i) => (
                  <Bar key={ch} dataKey={ch} stackId="a" fill={CROSS_COLORS[i % CROSS_COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasa de cierre: sector × canal</CardTitle>
          </CardHeader>
          <CardContent>
            <HeatmapMatrix
              data={sectorByChannel ?? []}
              rowKey="sector"
              colKey="channel"
              rowLabel="Sector"
              rowOrder={uniqueSectors}
              colOrder={uniqueChannels}
            />
          </CardContent>
        </Card>
      </div>

      {/* Caso de uso × Tamaño empresa */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Casos de uso por tamaño de empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={usecaseSizeStacked} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="row" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                {uniqueUseCases.map((uc, i) => (
                  <Bar key={uc} dataKey={uc} stackId="a" fill={CROSS_COLORS[i % CROSS_COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasa de cierre: caso de uso × tamaño</CardTitle>
          </CardHeader>
          <CardContent>
            <HeatmapMatrix
              data={usecaseByCompanySize ?? []}
              rowKey="use_case"
              colKey="company_size"
              rowLabel="Caso de uso"
              colOrder={COMPANY_ORDER}
            />
          </CardContent>
        </Card>
      </div>

      {/* Tamaño empresa × Canal */}
      <Card>
        <CardHeader>
          <CardTitle>Canales por tamaño de empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sizeChannelStacked} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="row" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
              {uniqueChannelsBySize.map((ch, i) => (
                <Bar key={ch} dataKey={ch} stackId="a" fill={CROSS_COLORS[i % CROSS_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
