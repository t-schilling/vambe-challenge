import axios from "axios"

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export const api = axios.create({ baseURL: BASE_URL })

// Clients
export const getClients = (params: Record<string, unknown>) =>
  api.get("/api/clients", { params }).then((r) => r.data)

export const getAllClients = (params?: Record<string, string>) =>
  api.get("/api/clients/all", { params }).then((r) => r.data)

export const getFilterOptions = () =>
  api.get("/api/clients/filter-options").then((r) => r.data)

// Analytics
export interface OverviewData {
  total_clients: number
  closed_count: number
  close_rate: number
  avg_transcript_words: number
  avg_interaction_volume: number
  top_vendedor: string | null
  deep_count: number
  pct_deep: number
}

export const getOverview = (params?: Record<string, string>) =>
  api.get<OverviewData>("/api/analytics/overview", { params }).then((r) => r.data)

export const getBySector = (params?: Record<string, string>) =>
  api.get("/api/analytics/by-sector", { params }).then((r) => r.data)

export const getBySalesperson = (params?: Record<string, string>) =>
  api.get("/api/analytics/by-salesperson", { params }).then((r) => r.data)

export const getByChannel = (params?: Record<string, string>) =>
  api.get("/api/analytics/by-channel", { params }).then((r) => r.data)

export const getByVolume = (params?: Record<string, string>) =>
  api.get("/api/analytics/by-volume", { params }).then((r) => r.data)

export const getByUseCase = (params?: Record<string, string>) =>
  api.get("/api/analytics/by-use-case", { params }).then((r) => r.data)

export const getByPainPoint = (params?: Record<string, string>) =>
  api.get("/api/analytics/by-pain-point", { params }).then((r) => r.data)

export const getByMeetingDepth = (params?: Record<string, string>) =>
  api.get("/api/analytics/by-meeting-depth", { params }).then((r) => r.data)

export const getByCompanySize = (params?: Record<string, string>) =>
  api.get("/api/analytics/by-company-size", { params }).then((r) => r.data)

export const getByIntegrationNeeds = (params?: Record<string, string>) =>
  api.get("/api/analytics/by-integration-needs", { params }).then((r) => r.data)

export const getTimeline = (params?: Record<string, string>) =>
  api.get("/api/analytics/timeline", { params }).then((r) => r.data)

// Cross-analysis
export const getSectorByChannel = (params?: Record<string, string>) =>
  api.get("/api/analytics/sector-by-channel", { params }).then((r) => r.data)

export const getUsecaseByCompanySize = (params?: Record<string, string>) =>
  api.get("/api/analytics/usecase-by-companysize", { params }).then((r) => r.data)

export const getCompanySizeByChannel = (params?: Record<string, string>) =>
  api.get("/api/analytics/companysize-by-channel", { params }).then((r) => r.data)

// Insights
export const generateInsights = (metrics: Record<string, unknown>) =>
  api.post("/api/analytics/insights", { metrics }).then((r) => r.data)

// Process
export const triggerProcess = (force = false) =>
  api.post("/api/process", null, { params: { force } }).then((r) => r.data)

export const getProcessStatus = () =>
  api.get("/api/process/status").then((r) => r.data)
