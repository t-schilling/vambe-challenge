import { Menu } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getFilterOptions } from "@/lib/api"
import { useFilters } from "@/contexts/FiltersContext"

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { filters, setFilters } = useFilters()

  const { data: filterOptions } = useQuery({
    queryKey: ["filter-options"],
    queryFn: getFilterOptions,
  })

  const vendedores: string[] = filterOptions?.vendedor ?? []

  const inputClass =
    "h-8 rounded-md border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      <div className="flex flex-1 items-center justify-end gap-3 flex-wrap">
        {/* Date range */}
        <div className="flex items-center gap-2">
          <label htmlFor="filter-date-from" className="text-xs text-muted-foreground whitespace-nowrap">Desde</label>
          <input
            id="filter-date-from"
            type="date"
            className={inputClass}
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="filter-date-to" className="text-xs text-muted-foreground whitespace-nowrap">Hasta</label>
          <input
            id="filter-date-to"
            type="date"
            className={inputClass}
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          />
        </div>

        {/* Vendedor filter */}
        <select
          className={inputClass + " pr-8"}
          value={filters.vendedor}
          onChange={(e) => setFilters((f) => ({ ...f, vendedor: e.target.value }))}
        >
          <option value="">Todos los vendedores</option>
          {vendedores.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>

        {/* Reset */}
        {(filters.vendedor || filters.dateFrom || filters.dateTo) && (
          <button
            onClick={() => setFilters({ vendedor: "", dateFrom: "", dateTo: "" })}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Limpiar
          </button>
        )}
      </div>
    </header>
  )
}
