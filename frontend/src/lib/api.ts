import axios from "axios"

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export const api = axios.create({ baseURL: BASE_URL })

// Clients
export const getClients = (params: Record<string, unknown>) =>
  api.get("/api/clients", { params }).then((r) => r.data)

export const getFilterOptions = () =>
  api.get("/api/clients/filter-options").then((r) => r.data)

// Analytics
export const getOverview = () =>
  api.get("/api/analytics/overview").then((r) => r.data)

export const getBySector = () =>
  api.get("/api/analytics/by-sector").then((r) => r.data)

export const getBySalesperson = () =>
  api.get("/api/analytics/by-salesperson").then((r) => r.data)

export const getByChannel = () =>
  api.get("/api/analytics/by-channel").then((r) => r.data)

export const getByVolume = () =>
  api.get("/api/analytics/by-volume").then((r) => r.data)

export const getByUseCase = () =>
  api.get("/api/analytics/by-use-case").then((r) => r.data)

export const getByPainPoint = () =>
  api.get("/api/analytics/by-pain-point").then((r) => r.data)

export const getByMeetingDepth = () =>
  api.get("/api/analytics/by-meeting-depth").then((r) => r.data)

export const getTimeline = () =>
  api.get("/api/analytics/timeline").then((r) => r.data)

// Insights
export const generateInsights = (metrics: Record<string, unknown>) =>
  api.post("/api/analytics/insights", { metrics }).then((r) => r.data)

// Process
export const triggerProcess = (force = false) =>
  api.post("/api/process", null, { params: { force } }).then((r) => r.data)

export const getProcessStatus = () =>
  api.get("/api/process/status").then((r) => r.data)
