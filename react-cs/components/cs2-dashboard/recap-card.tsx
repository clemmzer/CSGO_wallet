"use client"

import { fmt } from "./index"
import type { PortfolioSkin } from "./index"

interface RecapCardProps {
  totalBuy: number
  totalMarket: number
  profit: number
  pct: number
  active: PortfolioSkin[]
}

export function RecapCard({ totalBuy, totalMarket, profit, pct, active }: RecapCardProps) {
  const stats = [
    { label: "Investi", val: `${fmt(totalBuy)} €`, color: "text-foreground" },
    { label: "Valeur marché", val: `${fmt(totalMarket)} €`, color: "text-accent" },
    { label: "Profit total", val: `${profit >= 0 ? "+" : ""}${fmt(profit)} €`, color: profit >= 0 ? "text-accent" : "text-destructive" },
    { label: "Performance", val: `${pct >= 0 ? "+" : ""}${fmt(pct, 1)} %`, color: pct >= 0 ? "text-accent" : "text-destructive" },
  ]

  const topPerf = [...active]
    .sort((a, b) => {
      const pa = a.buy > 0 ? ((a.marketPrice ?? a.buy) - a.buy) / a.buy : 0
      const pb = b.buy > 0 ? ((b.marketPrice ?? b.buy) - b.buy) / b.buy : 0
      return pb - pa
    })
    .slice(0, 4)

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden p-4">
      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3.5">
        Récapitulatif
      </h3>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-px bg-border rounded-lg overflow-hidden mb-3.5">
        {stats.map(item => (
          <div key={item.label} className="bg-card p-3">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              {item.label}
            </div>
            <div className={`font-mono text-base font-medium ${item.color}`}>
              {item.val}
            </div>
          </div>
        ))}
      </div>

      {/* Top performances */}
      {active.length > 0 && (
        <>
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
            Top performances
          </h4>
          <div className="space-y-0">
            {topPerf.map((s, i) => {
              const d = (s.marketPrice ?? s.buy) - s.buy
              const dp = s.buy > 0 ? (d / s.buy) * 100 : 0
              const isPositive = dp >= 0

              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-[11px] text-muted-foreground w-4 flex-shrink-0">
                      #{i + 1}
                    </span>
                    {s.image && (
                      <img
                        src={s.image}
                        alt=""
                        className="w-[30px] h-[21px] object-contain rounded-sm flex-shrink-0"
                      />
                    )}
                    <span className="text-xs font-medium text-muted-foreground truncate">
                      {s.name}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div
                      className={`font-mono text-xs font-medium ${
                        isPositive ? "text-accent" : "text-destructive"
                      }`}
                    >
                      {isPositive ? "+" : ""}{dp.toFixed(1)}%
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground/60">
                      {d >= 0 ? "+" : ""}{d.toFixed(2)} €
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
