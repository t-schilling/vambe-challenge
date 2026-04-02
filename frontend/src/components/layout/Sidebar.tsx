import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Building2,
  BarChart2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/vendedores", label: "Vendedores", icon: Users },
  { to: "/mercado", label: "Mercado & Producto", icon: TrendingUp },
  { to: "/clientes", label: "Clientes", icon: Building2 },
  { to: "/explorador", label: "Explorador", icon: BarChart2 },
]

interface SidebarProps {
  onClose: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  return (
    <div className="flex h-full w-60 flex-col bg-slate-900 text-slate-100">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5">
        <span className="text-lg font-bold tracking-tight text-white">
          Vambe Analytics
        </span>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:text-white lg:hidden"
          aria-label="Cerrar menú"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-3 pb-6">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
