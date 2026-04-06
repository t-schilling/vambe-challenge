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
} from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const LOW_SAMPLE = 3

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
          formatter={(v, _name, props) => {
            const n = totalKey ? (props.payload[totalKey] as number) : null
            const label = n !== null ? `${v}${unit} (n=${n})` : `${v}${unit}`
            const warning = n !== null && n < LOW_SAMPLE ? " ⚠ muestra pequeña" : ""
            return [`${label}${warning}`, dataKey]
          }}
        />
        <Bar dataKey={valueKey} name={dataKey} radius={[0, 4, 4, 0]}>
          {data.map((row, i) => {
            const n = totalKey ? (row[totalKey] as number) : Infinity
            return <Cell key={i} fill={color} opacity={n < LOW_SAMPLE ? 0.4 : 1} />
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
                  formatter={(v, n, props) => {
                    const total = props.payload.total as number
                    const warning = total < LOW_SAMPLE ? " ⚠ muestra pequeña" : ""
                    return [`${v}% (n=${total})${warning}`, n]
                  }}
                />
                <Bar dataKey="Tasa cierre" radius={[4, 4, 0, 0]}>
                  {volumeData.map((row, i) => (
                    <Cell key={i} fill="#6366f1" opacity={row.total < LOW_SAMPLE ? 0.4 : 1} />
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
                  formatter={(v, n, props) => {
                    const total = props.payload.total as number
                    const warning = total < LOW_SAMPLE ? " ⚠ muestra pequeña" : ""
                    return [`${v}% (n=${total})${warning}`, n]
                  }}
                />
                <Bar dataKey="Tasa cierre" radius={[4, 4, 0, 0]}>
                  {companySizeData.map((row, i) => (
                    <Cell key={i} fill="#6366f1" opacity={row.total < LOW_SAMPLE ? 0.4 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
