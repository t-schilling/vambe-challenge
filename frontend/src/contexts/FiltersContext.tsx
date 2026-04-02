import { createContext, useContext, useMemo, useState } from "react"

interface Filters {
  vendedor: string
  dateFrom: string
  dateTo: string
}

interface FiltersContextType {
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  apiParams: Record<string, string>
}

const defaultFilters: Filters = { vendedor: "", dateFrom: "", dateTo: "" }

const FiltersContext = createContext<FiltersContextType>({
  filters: defaultFilters,
  setFilters: () => {},
  apiParams: {},
})

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters)

  const apiParams = useMemo(() => {
    const p: Record<string, string> = {}
    if (filters.vendedor) p.vendedor = filters.vendedor
    if (filters.dateFrom) p.date_from = filters.dateFrom
    if (filters.dateTo) p.date_to = filters.dateTo
    return p
  }, [filters])

  return (
    <FiltersContext.Provider value={{ filters, setFilters, apiParams }}>
      {children}
    </FiltersContext.Provider>
  )
}

export const useFilters = () => useContext(FiltersContext)
