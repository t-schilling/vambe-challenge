import { useState, useRef, useEffect } from "react"
import { Download, Loader2 } from "lucide-react"
import { useFilters } from "@/contexts/FiltersContext"
import {
  getAllClients,
  getBySector,
  getBySalesperson,
  getByChannel,
  getByVolume,
  getByUseCase,
  getByPainPoint,
} from "@/lib/api"
import { exportToCSV, todayISO } from "@/lib/export"

export default function ExportButton() {
  const { apiParams } = useFilters()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<"clients" | "metrics" | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  async function handleExportClients() {
    setLoading("clients")
    setOpen(false)
    try {
      const clients = await getAllClients(apiParams)
      const rows = clients.map((c: Record<string, unknown>) => ({
        id: c.id,
        nombre: c.nombre,
        correo: c.correo,
        telefono: c.telefono,
        fecha_reunion: c.fecha_reunion,
        vendedor: c.vendedor,
        closed: c.closed,
        sector: c.sector,
        primary_use_case: c.primary_use_case,
        main_pain_point: c.main_pain_point,
        client_sentiment: c.client_sentiment,
        urgency: c.urgency,
        company_size: c.company_size,
        interaction_volume_tier: c.interaction_volume_tier,
        interaction_volume_estimate: c.interaction_volume_estimate,
        discovery_channel: c.discovery_channel,
        integration_needs: Array.isArray(c.integration_needs) ? c.integration_needs.join("|") : "",
        meeting_depth: c.meeting_depth,
        client_engagement: c.client_engagement,
        transcript_word_count: c.transcript_word_count,
      }))
      exportToCSV(rows, `vambe-clientes-${todayISO()}.csv`)
    } finally {
      setLoading(null)
    }
  }

  async function handleExportMetrics() {
    setLoading("metrics")
    setOpen(false)
    try {
      const [sectors, salespersons, channels, volumes, useCases, painPoints] = await Promise.all([
        getBySector(apiParams),
        getBySalesperson(apiParams),
        getByChannel(apiParams),
        getByVolume(apiParams),
        getByUseCase(apiParams),
        getByPainPoint(apiParams),
      ])

      const rows: Record<string, unknown>[] = [
        ...sectors.map((r: Record<string, unknown>) => ({ dimension: "sector", valor: r.sector, reuniones: r.total, cerrados: r.closed, tasa_cierre: r.close_rate })),
        ...salespersons.map((r: Record<string, unknown>) => ({ dimension: "vendedor", valor: r.vendedor, reuniones: r.total, cerrados: r.closed, tasa_cierre: r.close_rate })),
        ...channels.map((r: Record<string, unknown>) => ({ dimension: "canal", valor: r.channel, reuniones: r.total, cerrados: r.closed, tasa_cierre: r.close_rate })),
        ...volumes.map((r: Record<string, unknown>) => ({ dimension: "volumen_tier", valor: r.tier, reuniones: r.total, cerrados: r.closed, tasa_cierre: r.close_rate })),
        ...useCases.map((r: Record<string, unknown>) => ({ dimension: "use_case", valor: r.use_case, reuniones: r.total, cerrados: r.closed, tasa_cierre: r.close_rate })),
        ...painPoints.map((r: Record<string, unknown>) => ({ dimension: "pain_point", valor: r.pain_point, reuniones: r.total, cerrados: r.closed, tasa_cierre: r.close_rate })),
      ]

      exportToCSV(rows, `vambe-metricas-${todayISO()}.csv`)
    } finally {
      setLoading(null)
    }
  }

  const btnClass = "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md text-left disabled:opacity-50"

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!!loading}
        className="flex h-8 items-center gap-1.5 rounded-md border border-input px-2.5 text-sm hover:bg-accent disabled:opacity-50"
      >
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
        Exportar
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-52 rounded-lg border bg-popover shadow-md">
          <div className="p-1">
            <button className={btnClass} onClick={handleExportClients} disabled={!!loading}>
              <Download className="size-3.5 shrink-0 text-muted-foreground" />
              Datos de clientes
            </button>
            <button className={btnClass} onClick={handleExportMetrics} disabled={!!loading}>
              <Download className="size-3.5 shrink-0 text-muted-foreground" />
              Métricas agregadas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
