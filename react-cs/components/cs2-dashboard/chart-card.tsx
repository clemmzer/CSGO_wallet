"use client"

import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts"
import { fmt } from "./index"
import { CustomTooltip } from "./custom-tooltip"
import type { PortfolioSkin } from "./index"

interface ChartCardProps {
  tab: string
  onTabChange: (tab: string) => void
  range: string
  onRangeChange: (range: string) => void
  ranges: { key: string; label: string; ms: number }[]
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
  active: PortfolioSkin[]
  hidden: Record<number, boolean>
  onToggleHide: (id: number) => void
}

export function ChartCard({
  tab,
  onTabChange,
  range,
  onRangeChange,
  ranges,
  timeline,
  hasHist,
  lastVal,
  chgAbs,
  chgPct,
  isUp,
  compData,
  active,
  hidden,
  onToggleHide
}: ChartCardProps) {
  const tabs = ["valeur", "profit", "skins", "comparaison"]

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-3">
      {/* Header */}
      <div className="flex items-start justify-between p-4 gap-3 flex-wrap">
        <div>
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Évolution du portefeuille
          </h3>
          {hasHist && (
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-3xl font-medium text-foreground">
                {fmt(lastVal)} €
              </span>
              <span
                className={`inline-block px-2 py-0.5 rounded font-mono text-xs font-medium ${
                  isUp
                    ? "text-accent bg-accent/10"
                    : "text-destructive bg-destructive/10"
                }`}
              >
                {isUp ? "+" : ""}{fmt(chgAbs)} € ({isUp ? "+" : ""}{fmt(chgPct, 2)}%)
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Tab switcher */}
          <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => onTabChange(t)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  tab === t
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Range selector */}
          {tab !== "comparaison" && (
            <div className="flex gap-0.5">
              {ranges.map(r => (
                <button
                  key={r.key}
                  onClick={() => onRangeChange(r.key)}
                  className={`px-2 py-1 rounded font-mono text-[10px] font-medium transition-colors border ${
                    range === r.key
                      ? "border-border/80 text-accent bg-accent/5"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend for skins tab */}
      {tab === "skins" && (
        <div className="flex flex-wrap gap-3 px-4 pb-2">
          {active.map(s => (
            <span
              key={s.id}
              onClick={() => onToggleHide(s.id)}
              className={`flex items-center gap-1.5 text-[11px] font-medium cursor-pointer select-none transition-opacity ${
                hidden[s.id] ? "opacity-30" : "text-muted-foreground"
              }`}
            >
              <span
                className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: hidden[s.id] ? "var(--border)" : s.color }}
              />
              {s.name}
            </span>
          ))}
        </div>
      )}

      {/* Chart area */}
      <div className="px-0 py-3">
        {tab === "comparaison" ? (
          compData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, compData.length * 44 + 30)}>
              <BarChart data={compData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="2 2" className="stroke-border" horizontal={false}/>
                <XAxis
                  type="number"
                  tick={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
                  className="fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => v.toFixed(0) + "€"}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontFamily: "var(--font-sans)", fontSize: 11 }}
                  className="fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip/>} cursor={{ className: "fill-foreground/5" }}/>
                <Bar dataKey="marche" name="Marché" className="fill-accent" barSize={9} radius={[0, 3, 3, 0]} fillOpacity={0.85}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Aucun skin visible."/>
          )
        ) : !hasHist ? (
          <EmptyChart icon="📈" message='Cliquez "↻ Actualiser" pour enregistrer le premier point de données. Les courbes se construiront au fil du temps.'/>
        ) : tab === "valeur" ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={timeline} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.15}/>
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 2" className="stroke-border"/>
              <XAxis
                dataKey="label"
                tick={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                tickFormatter={v => v.toFixed(0) + "€"}
                width={50}
                orientation="right"
                domain={["dataMin - 3", "dataMax + 3"]}
              />
              <Tooltip content={<CustomTooltip/>} cursor={{ className: "stroke-foreground/5", strokeWidth: 1 }}/>
              <Area
                type="monotone"
                dataKey="valeur"
                name="Valeur"
                className="stroke-accent"
                strokeWidth={1.5}
                fill="url(#gV)"
                dot={false}
                activeDot={{ r: 3, className: "fill-accent", strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="ref"
                name="Prix initial"
                className="stroke-destructive"
                strokeWidth={1}
                strokeDasharray="5 4"
                dot={false}
                opacity={0.4}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : tab === "profit" ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={timeline} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.12}/>
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 2" className="stroke-border"/>
              <XAxis
                dataKey="label"
                tick={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                tickFormatter={v => v.toFixed(0) + "€"}
                width={50}
                orientation="right"
              />
              <Tooltip content={<CustomTooltip/>} cursor={{ className: "stroke-foreground/5", strokeWidth: 1 }}/>
              <ReferenceLine y={0} className="stroke-border" strokeDasharray="3 3"/>
              <Area
                type="monotone"
                dataKey="profit"
                name="Profit"
                className="stroke-accent"
                strokeWidth={1.5}
                fill="url(#gP)"
                dot={false}
                activeDot={{ r: 3, className: "fill-accent", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={timeline} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="2 2" className="stroke-border"/>
              <XAxis
                dataKey="label"
                tick={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                tickFormatter={v => v.toFixed(0) + "€"}
                width={50}
                orientation="right"
                domain={["dataMin - 2", "dataMax + 2"]}
              />
              <Tooltip content={<CustomTooltip/>} cursor={{ className: "stroke-foreground/5", strokeWidth: 1 }}/>
              {active.map(s => !hidden[s.id] && (
                <Line
                  key={s.id}
                  type="monotone"
                  dataKey={s.name}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function EmptyChart({ icon, message }: { icon?: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[220px] gap-2 text-muted-foreground text-center">
      {icon && <div className="text-4xl mb-1">{icon}</div>}
      <p className="text-xs leading-relaxed max-w-[280px]">{message}</p>
    </div>
  )
}
