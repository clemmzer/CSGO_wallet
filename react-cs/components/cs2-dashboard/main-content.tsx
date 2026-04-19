"use client"

import { BarChart3 } from "lucide-react"
import { RANGES, fmt } from "./index"
import { ChartCard } from "./chart-card"
import { ProfitChart } from "./profit-chart"
import { RecapCard } from "./recap-card"
import type { PortfolioSkin } from "./index"

interface MainContentProps {
  portfolio: PortfolioSkin[]
  active: PortfolioSkin[]
  totalBuy: number
  totalMarket: number
  profit: number
  pct: number
  totalPts: number
  tab: string
  onTabChange: (tab: string) => void
  range: string
  onRangeChange: (range: string) => void
  timeline: Record<string, unknown>[]
  hasHist: boolean
  lastVal: number
  chgAbs: number
  chgPct: number
  isUp: boolean
  compData: {
    name: string
    achat: number
    marche: number
    profit: number
    color: string
  }[]
  hidden: Record<number, boolean>
  onToggleHide: (id: number) => void
}

export function MainContent({
  portfolio,
  active,
  totalBuy,
  totalMarket,
  profit,
  pct,
  totalPts,
  tab,
  onTabChange,
  range,
  onRangeChange,
  timeline,
  hasHist,
  lastVal,
  chgAbs,
  chgPct,
  isUp,
  compData,
  hidden,
  onToggleHide
}: MainContentProps) {
  if (portfolio.length === 0) {
    return (
      <main className="col-start-2 row-start-2 overflow-y-auto overflow-x-hidden p-6 bg-background">
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
          <div className="text-6xl">🎯</div>
          <div className="text-xl font-semibold text-foreground">Aucun skin</div>
          <p className="text-sm text-muted-foreground max-w-[340px] leading-relaxed">
            Ajoutez vos premiers skins via le panneau de gauche. Les courbes d&apos;évolution se construiront automatiquement.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="col-start-2 row-start-2 overflow-y-auto overflow-x-hidden p-5 bg-background">
      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-px bg-border rounded-xl overflow-hidden mb-4">
        <div className="bg-card p-4">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Investi
          </div>
          <div className="font-mono text-xl font-medium text-foreground leading-none">
            {fmt(totalBuy)} €
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5">
            {active.length} skin{active.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="bg-card p-4">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Valeur marché
          </div>
          <div className="font-mono text-xl font-medium text-foreground leading-none">
            {fmt(totalMarket)} €
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5">
            Steam lowest price
          </div>
        </div>
        <div className="bg-card p-4">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Profit / Perte
          </div>
          <div
            className={`font-mono text-xl font-medium leading-none ${
              profit >= 0 ? "text-accent" : "text-destructive"
            }`}
          >
            {profit >= 0 ? "+" : ""}{fmt(profit)} €
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5">
            {pct >= 0 ? "+" : ""}{fmt(pct, 1)} % depuis l&apos;achat
          </div>
        </div>
        <div className="bg-card p-4">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Points de données
          </div>
          <div className="font-mono text-xl font-medium text-foreground leading-none">
            {totalPts}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5">
            enregistrés par le proxy
          </div>
        </div>
      </div>

      {/* Main Chart Card */}
      <ChartCard
        tab={tab}
        onTabChange={onTabChange}
        range={range}
        onRangeChange={onRangeChange}
        ranges={RANGES}
        timeline={timeline}
        hasHist={hasHist}
        lastVal={lastVal}
        chgAbs={chgAbs}
        chgPct={chgPct}
        isUp={isUp}
        compData={compData}
        active={active}
        hidden={hidden}
        onToggleHide={onToggleHide}
      />

      {/* Bottom Grid */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <ProfitChart compData={compData}/>
        <RecapCard
          totalBuy={totalBuy}
          totalMarket={totalMarket}
          profit={profit}
          pct={pct}
          active={active}
        />
      </div>
    </main>
  )
}
