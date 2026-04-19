"use client"

import { Sun, Moon, RefreshCw, Zap, Download } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { Button } from "@/components/ui/button"
import type { PortfolioSkin } from "./index"

interface TopBarProps {
  lastRef: Date | null
  refreshing: boolean
  onRefresh: () => void
  autoEnabled: boolean
  onToggleAuto: () => void
  countdown: string
  portfolio: PortfolioSkin[]
}

export function TopBar({
  lastRef,
  refreshing,
  onRefresh,
  autoEnabled,
  onToggleAuto,
  countdown,
  portfolio
}: TopBarProps) {
  const { theme, toggleTheme, mounted } = useTheme()

  const exportCSV = () => {
    if (!portfolio.length) return
    const headers = ["Arme", "Skin", "Achat (€)", "Marché (€)", "Profit (€)", "Performance (%)"]
    const rows = portfolio.map(s => {
      const market = s.marketPrice ?? s.buy
      const profit = market - s.buy
      const perf = s.buy > 0 ? (profit / s.buy) * 100 : 0
      return [s.weapon, s.name, s.buy.toFixed(2), market.toFixed(2), profit.toFixed(2), perf.toFixed(1)]
    })
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `cs2-portfolio-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <header className="col-span-2 row-start-1 flex items-center px-5 border-b border-border bg-background gap-3">
      {/* Logo */}
      <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
        <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="28" height="28" rx="7" className="fill-card stroke-border" strokeWidth="1"/>
            <path d="M14 5L19 11H9L14 5Z" className="fill-accent"/>
            <path d="M14 23L9 17H19L14 23Z" className="fill-accent/50"/>
            <rect x="11" y="11" width="6" height="6" rx="1" className="fill-accent/90"/>
          </svg>
        </div>
        CS2 Tracker
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-border mx-1"/>

      {/* Label */}
      <span className="text-xs text-muted-foreground font-normal">Portfolio</span>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        {lastRef && (
          <span className="text-[11px] text-muted-foreground">
            màj {lastRef.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}

        {/* Live badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card text-[11px] font-medium text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"/>
          LIVE
        </div>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className="h-[30px] px-3 text-xs font-medium"
        >
          <RefreshCw className={`w-3 h-3 mr-1.5 ${refreshing ? "animate-spin" : ""}`}/>
          Actualiser
        </Button>

        {/* Auto toggle */}
        <Button
          variant={autoEnabled ? "default" : "outline"}
          size="sm"
          onClick={onToggleAuto}
          className="h-[30px] px-3 text-xs font-medium"
        >
          <Zap className="w-3 h-3 mr-1.5"/>
          Auto {autoEnabled ? countdown : "Off"}
        </Button>

        {/* Export CSV */}
        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          disabled={!portfolio.length}
          className="h-[30px] px-3 text-xs font-medium"
        >
          <Download className="w-3 h-3 mr-1.5"/>
          Exporter CSV
        </Button>

        {/* Theme toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="h-[30px] w-[30px] p-0"
        >
          {mounted && (
            theme === "dark" ? (
              <Sun className="w-4 h-4"/>
            ) : (
              <Moon className="w-4 h-4"/>
            )
          )}
        </Button>
      </div>
    </header>
  )
}
