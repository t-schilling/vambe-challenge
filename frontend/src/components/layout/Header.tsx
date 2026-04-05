import { useState, useEffect } from "react"
import { Menu, SlidersHorizontal, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getFilterOptions } from "@/lib/api"
import { useFilters } from "@/contexts/FiltersContext"
import ExportButton from "./ExportButton"

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { filters, setFilters } = useFilters()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: filterOptions } = useQuery({
    queryKey: ["filter-options"],
    queryFn: getFilterOptions,
  })

  const vendedores: string[] = filterOptions?.vendedor ?? []

  const activeCount = [filters.vendedor, filters.dateFrom, filters.dateTo].filter(Boolean).length

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [drawerOpen])

  const inputClass =
    "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"

  const filterControls = (
    <>
      {/* Date range */}
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-date-from" className="text-xs text-muted-foreground">Desde</label>
        <input
          id="filter-date-from"
          type="date"
          className={inputClass}
          value={filters.dateFrom}
          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-date-to" className="text-xs text-muted-foreground">Hasta</label>
        <input
          id="filter-date-to"
          type="date"
          className={inputClass}
          value={filters.dateTo}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
        />
      </div>

      {/* Vendedor filter */}
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-vendedor" className="text-xs text-muted-foreground">Vendedor</label>
        <select
          id="filter-vendedor"
          className={inputClass}
          value={filters.vendedor}
          onChange={(e) => setFilters((f) => ({ ...f, vendedor: e.target.value }))}
        >
          <option value="">Todos los vendedores</option>
          {vendedores.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      {/* Reset */}
      {activeCount > 0 && (
        <button
          onClick={() => { setFilters({ vendedor: "", dateFrom: "", dateTo: "" }); setDrawerOpen(false) }}
          className="text-xs text-muted-foreground underline hover:text-foreground text-left"
        >
          Limpiar filtros
        </button>
      )}
    </>
  )

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </button>

        {/* Mobile: title + filter button */}
        <span className="text-sm font-medium lg:hidden flex-1">Vambe Challenge</span>
        <button
          onClick={() => setDrawerOpen(true)}
          className="relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm border hover:bg-accent lg:hidden"
          aria-label="Abrir filtros"
        >
          <SlidersHorizontal className="size-4" />
          Filtros
          {activeCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </button>

        {/* Desktop: inline filters */}
        <div className="hidden lg:flex flex-1 items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="filter-date-from-desktop" className="text-xs text-muted-foreground whitespace-nowrap">Desde</label>
            <input
              id="filter-date-from-desktop"
              type="date"
              className="h-8 rounded-md border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="filter-date-to-desktop" className="text-xs text-muted-foreground whitespace-nowrap">Hasta</label>
            <input
              id="filter-date-to-desktop"
              type="date"
              className="h-8 rounded-md border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            />
          </div>
          <select
            className="h-8 rounded-md border border-input bg-transparent px-2.5 pr-8 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            value={filters.vendedor}
            onChange={(e) => setFilters((f) => ({ ...f, vendedor: e.target.value }))}
          >
            <option value="">Todos los vendedores</option>
            {vendedores.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          {activeCount > 0 && (
            <button
              onClick={() => setFilters({ vendedor: "", dateFrom: "", dateTo: "" })}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Limpiar
            </button>
          )}
          <ExportButton />
        </div>
      </header>

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Bottom sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-background p-6 shadow-xl lg:hidden">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-semibold">Filtros</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
                aria-label="Cerrar filtros"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {filterControls}
            </div>
            <div className="mt-6">
              <ExportButton />
            </div>
          </div>
        </>
      )}
    </>
  )
}
