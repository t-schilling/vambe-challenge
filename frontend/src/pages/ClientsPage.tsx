import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronUp, ChevronDown, ChevronsUpDown, Loader2, Search, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react"
import { useFilters } from "@/contexts/FiltersContext"
import { getClients, getFilterOptions } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Client {
  id: number
  nombre: string
  correo: string
  vendedor: string | null
  fecha_reunion: string | null
  sector: string | null
  primary_use_case: string | null
  client_sentiment: string | null
  meeting_depth: string | null
  closed: boolean
  transcripcion: string | null
  transcript_word_count: number | null
  interaction_volume_tier: string | null
  interaction_volume_estimate: number | null
  discovery_channel: string | null
  main_pain_point: string | null
  integration_needs: string[] | null
  urgency: string | null
  company_size: string | null
  client_engagement: string | null
  categorized: boolean
}

const SENTIMENT_COLORS: Record<string, string> = {
  very_positive: "bg-emerald-100 text-emerald-800",
  positive: "bg-green-100 text-green-800",
  neutral: "bg-slate-100 text-slate-700",
  skeptical: "bg-amber-100 text-amber-800",
}

const DEPTH_COLORS: Record<string, string> = {
  deep: "bg-indigo-100 text-indigo-800",
  moderate: "bg-blue-100 text-blue-800",
  superficial: "bg-slate-100 text-slate-600",
}

type SortField = "nombre" | "fecha_reunion" | "vendedor" | "closed" | "sector" | "primary_use_case" | "client_sentiment" | "meeting_depth"

const COLUMNS: { key: SortField | null; label: string }[] = [
  { key: "nombre", label: "Nombre" },
  { key: null, label: "Correo" },
  { key: "vendedor", label: "Vendedor" },
  { key: "fecha_reunion", label: "Fecha" },
  { key: "sector", label: "Sector" },
  { key: "primary_use_case", label: "Use Case" },
  { key: "client_sentiment", label: "Sentiment" },
  { key: "meeting_depth", label: "Depth" },
  { key: "closed", label: "Estado" },
]

const inputClass = "h-8 rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"

function SortIcon({ col, sortBy, sortOrder }: { col: SortField | null; sortBy: SortField; sortOrder: "asc" | "desc" }) {
  if (!col) return null
  if (sortBy !== col) return <ChevronsUpDown className="ml-1 inline size-3 text-muted-foreground" />
  return sortOrder === "asc"
    ? <ChevronUp className="ml-1 inline size-3" />
    : <ChevronDown className="ml-1 inline size-3" />
}

export default function ClientsPage() {
  const { apiParams } = useFilters()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [sortBy, setSortBy] = useState<SortField>("nombre")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [selected, setSelected] = useState<Client | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [filters, setFilters] = useState<Record<string, string>>({
    sector: "", vendedor: "", closed: "", client_sentiment: "",
    discovery_channel: "", primary_use_case: "", meeting_depth: "",
  })

  const queryParams: Record<string, unknown> = {
    ...apiParams,
    page,
    page_size: 15,
    sort_by: sortBy,
    sort_order: sortOrder,
    ...(search && { search }),
    ...Object.fromEntries(
      Object.entries(filters).filter(([k, v]) => v !== "" && k !== "closed")
    ),
  }
  if (filters.closed === "true") queryParams.closed = true
  else if (filters.closed === "false") queryParams.closed = false

  const { data, isLoading } = useQuery({
    queryKey: ["clients", queryParams],
    queryFn: () => getClients(queryParams),
  })

  const { data: filterOptions } = useQuery({
    queryKey: ["filter-options"],
    queryFn: getFilterOptions,
  })

  const clients: Client[] = data?.items ?? []
  const total: number = data?.total ?? 0
  const totalPages = Math.ceil(total / 15)

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  function handleSort(col: SortField) {
    if (sortBy === col) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(col)
      setSortOrder("asc")
    }
    setPage(1)
  }

  function handleSearch() {
    setSearch(searchInput)
    setPage(1)
  }

  function handleFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  function handleReset() {
    setSearch(""); setSearchInput("")
    setFilters({ sector: "", vendedor: "", closed: "", client_sentiment: "", discovery_channel: "", primary_use_case: "", meeting_depth: "" })
    setPage(1)
  }

  const filterSelects = (
    <>
      {([
        ["vendedor", "Vendedor"],
        ["sector", "Sector"],
        ["client_sentiment", "Sentiment"],
        ["primary_use_case", "Use Case"],
        ["meeting_depth", "Depth"],
        ["discovery_channel", "Canal"],
      ] as [string, string][]).map(([key, label]) => (
        <select
          key={key}
          className={inputClass + " pr-6"}
          value={filters[key]}
          onChange={(e) => handleFilter(key, e.target.value)}
        >
          <option value="">{label}</option>
          {(filterOptions?.[key] ?? []).map((v: string) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      ))}
      <select
        className={inputClass + " pr-6"}
        value={filters.closed}
        onChange={(e) => handleFilter("closed", e.target.value)}
      >
        <option value="">Estado</option>
        <option value="true">Cerrado</option>
        <option value="false">Abierto</option>
      </select>
    </>
  )

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Clientes</h1>

      {/* Search + filters */}
      <Card>
        <CardContent className="pt-4">
          {/* Search row — always visible */}
          <div className="flex gap-2">
            <div className="flex flex-1 gap-1.5">
              <input
                className={inputClass + " flex-1"}
                placeholder="Buscar nombre o email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="flex h-8 items-center rounded-md border border-input px-2.5 text-sm hover:bg-accent"
              >
                <Search className="size-3.5" />
              </button>
            </div>

            {/* Mobile: toggle filters */}
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className="relative flex h-8 items-center gap-1.5 rounded-md border border-input px-2.5 text-sm hover:bg-accent md:hidden"
            >
              <SlidersHorizontal className="size-3.5" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile: collapsible filters */}
          {filtersOpen && (
            <div className="mt-3 flex flex-col gap-2 md:hidden">
              {filterSelects}
              {(search || activeFilterCount > 0) && (
                <button onClick={handleReset} className="text-xs text-muted-foreground underline hover:text-foreground text-left">
                  Limpiar
                </button>
              )}
            </div>
          )}

          {/* Desktop: inline filters */}
          <div className="mt-3 hidden flex-wrap gap-3 md:flex">
            {filterSelects}
            {(search || activeFilterCount > 0) && (
              <button onClick={handleReset} className="text-xs text-muted-foreground underline hover:text-foreground">
                Limpiar
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table / Card view */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Mobile: card view */}
              <div className="divide-y md:hidden">
                {clients.map((c) => (
                  <div
                    key={c.id}
                    className="cursor-pointer px-4 py-3 hover:bg-muted/50 transition-colors"
                    onClick={() => setSelected(c)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.nombre}</p>
                        <p className="text-sm text-muted-foreground truncate">{c.vendedor ?? "—"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${c.closed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>
                        {c.closed ? "Cerrado" : "Abierto"}
                      </span>
                    </div>
                    {c.sector && (
                      <p className="mt-1 text-xs text-muted-foreground">{c.sector}</p>
                    )}
                  </div>
                ))}
                {clients.length === 0 && (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">Sin resultados</p>
                )}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      {COLUMNS.map(({ key, label }) => (
                        <th
                          key={label}
                          className={`px-4 py-3 font-medium ${key ? "cursor-pointer select-none hover:text-foreground" : ""}`}
                          onClick={() => key && handleSort(key)}
                        >
                          {label}
                          <SortIcon col={key} sortBy={sortBy} sortOrder={sortOrder} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c) => (
                      <tr
                        key={c.id}
                        className="cursor-pointer border-b last:border-0 hover:bg-muted/50 transition-colors"
                        onClick={() => setSelected(c)}
                      >
                        <td className="px-4 py-3 font-medium">{c.nombre}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.correo}</td>
                        <td className="px-4 py-3">{c.vendedor ?? "—"}</td>
                        <td className="px-4 py-3">{c.fecha_reunion ?? "—"}</td>
                        <td className="px-4 py-3">{c.sector ?? "—"}</td>
                        <td className="px-4 py-3">{c.primary_use_case ?? "—"}</td>
                        <td className="px-4 py-3">
                          {c.client_sentiment ? (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SENTIMENT_COLORS[c.client_sentiment] ?? "bg-slate-100 text-slate-700"}`}>
                              {c.client_sentiment}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {c.meeting_depth ? (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DEPTH_COLORS[c.meeting_depth] ?? "bg-slate-100 text-slate-700"}`}>
                              {c.meeting_depth}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.closed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>
                            {c.closed ? "Cerrado" : "Abierto"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {clients.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                          Sin resultados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} clientes · página {page} de {totalPages}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-10 w-10 items-center justify-center rounded-md border hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-10 w-10 items-center justify-center rounded-md border hover:bg-accent disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Client detail modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.nombre}</DialogTitle>
                <p className="text-sm text-muted-foreground">{selected.correo}</p>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2">
                <Detail label="Vendedor" value={selected.vendedor} />
                <Detail label="Fecha reunión" value={selected.fecha_reunion} />
                <Detail label="Sector" value={selected.sector} />
                <Detail label="Canal" value={selected.discovery_channel} />
                <Detail label="Use Case" value={selected.primary_use_case} />
                <Detail label="Pain Point" value={selected.main_pain_point} />
                <Detail label="Urgencia" value={selected.urgency} />
                <Detail label="Empresa" value={selected.company_size} />
                <Detail label="Volumen tier" value={selected.interaction_volume_tier} />
                <Detail label="Volumen est." value={selected.interaction_volume_estimate?.toString()} />
                <Detail label="Sentiment" value={selected.client_sentiment} />
                <Detail label="Meeting depth" value={selected.meeting_depth} />
                <Detail label="Engagement" value={selected.client_engagement} />
                <Detail label="Palabras" value={selected.transcript_word_count?.toLocaleString()} />
              </div>

              {selected.integration_needs?.length ? (
                <div className="text-sm">
                  <span className="font-medium text-muted-foreground">Integraciones:</span>{" "}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selected.integration_needs.map((n) => (
                      <span key={n} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{n}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selected.closed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>
                  {selected.closed ? "Cerrado" : "Abierto"}
                </span>
                {!selected.categorized && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                    Sin categorizar
                  </span>
                )}
              </div>

              {selected.transcripcion && (
                <div>
                  <p className="mb-1.5 text-sm font-medium text-muted-foreground">Transcripción</p>
                  <div className="max-h-48 overflow-y-auto rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {selected.transcripcion}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  )
}
