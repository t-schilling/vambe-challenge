import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import OverviewPage from "@/pages/OverviewPage"
import SalespersonPage from "@/pages/SalespersonPage"
import MarketPage from "@/pages/MarketPage"
import ClientsPage from "@/pages/ClientsPage"
import ExplorerPage from "@/pages/ExplorerPage"

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/vendedores" element={<SalespersonPage />} />
          <Route path="/mercado" element={<MarketPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/explorador" element={<ExplorerPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
