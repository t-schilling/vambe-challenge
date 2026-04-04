export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return

  const headers = Object.keys(data[0])
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return ""
    const s = Array.isArray(v) ? v.join("|") : String(v)
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const rows = data.map((row) => headers.map((h) => escape(row[h])).join(","))
  const csv = [headers.join(","), ...rows].join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
