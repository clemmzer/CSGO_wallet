"use client"

import { X } from "lucide-react"
import { AddSkinPanel } from "./add-skin-panel"
import type { SkinData, PortfolioSkin } from "./index"

interface SidebarProps {
  allSkins: SkinData[]
  loadingDB: boolean
  dbError: string | null
  portfolio: PortfolioSkin[]
  onAdd: (skin: Omit<PortfolioSkin, "id">) => void
  onDelete: (id: number) => void
  onToggleHide: (id: number) => void
  hidden: Record<number, boolean>
  weapons: string[]
  wFilter: string
  onFilterChange: (filter: string) => void
}

export function Sidebar({
  allSkins,
  loadingDB,
  dbError,
  portfolio,
  onAdd,
  onDelete,
  onToggleHide,
  hidden,
  weapons,
  wFilter,
  onFilterChange
}: SidebarProps) {
  return (
    <aside className="col-start-1 row-start-2 border-r border-border bg-background overflow-y-auto overflow-x-hidden">
      <div className="p-4">
        <AddSkinPanel
          onAdd={onAdd}
          allSkins={allSkins}
          loadingDB={loadingDB}
          dbError={dbError}
        />

        {portfolio.length > 0 && (
          <>
            <div className="h-px bg-border my-4"/>
            
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pb-3 mb-3 border-b border-border/50">
              Mes skins
            </h3>

            {/* Filter pills */}
            {weapons.length > 2 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {weapons.map(w => (
                  <button
                    key={w}
                    onClick={() => onFilterChange(w)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                      wFilter === w
                        ? "border-accent/30 text-accent bg-accent/5"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-border/80 bg-transparent"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            )}

            {/* Skin list */}
            <div className="space-y-1">
              {(wFilter === "Tout" ? portfolio : portfolio.filter(s => s.weapon === wFilter)).map(s => {
                const curr = s.marketPrice ?? s.buy
                const d = curr - s.buy
                const dp = s.buy > 0 ? (d / s.buy) * 100 : 0
                const isPositive = d >= 0

                return (
                  <div
                    key={s.id}
                    onClick={() => onToggleHide(s.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all border border-transparent hover:bg-muted/50 hover:border-border ${
                      hidden[s.id] ? "opacity-30" : ""
                    }`}
                  >
                    {/* Color accent */}
                    <div
                      className="w-[3px] h-8 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: s.color }}
                    />

                    {/* Thumbnail */}
                    {s.image ? (
                      <img
                        src={s.image}
                        alt=""
                        className="w-11 h-[30px] object-contain flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-[30px] bg-muted rounded flex-shrink-0"/>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">
                        {s.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {s.weapon} · {s.buy.toFixed(2)} €
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-xs font-medium text-muted-foreground">
                        {curr.toFixed(2)} €
                      </div>
                      <div
                        className={`font-mono text-[10px] ${
                          isPositive ? "text-accent" : "text-destructive"
                        }`}
                      >
                        {isPositive ? "+" : ""}{dp.toFixed(1)}%
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(s.id)
                      }}
                      className="w-6 h-6 rounded flex items-center justify-center border border-border text-muted-foreground hover:border-destructive hover:text-destructive hover:bg-destructive/5 transition-colors flex-shrink-0"
                    >
                      <X className="w-3 h-3"/>
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
