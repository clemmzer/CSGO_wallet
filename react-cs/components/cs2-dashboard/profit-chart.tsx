"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from "recharts"
import { CustomTooltip } from "./custom-tooltip"

interface ProfitChartProps {
  compData: {
    name: string
    achat: number
    marche: number
    profit: number
    color: string
  }[]
}

export function ProfitChart({ compData }: ProfitChartProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3.5">
          Profit par skin
        </h3>
        {compData.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(160, compData.length * 42 + 20)}>
            <BarChart data={compData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="2 2" className="stroke-border" horizontal={false}/>
              <XAxis
                type="number"
                tick={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                tickFormatter={v => (v >= 0 ? "+" : "") + v.toFixed(0) + "€"}
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
              <ReferenceLine x={0} className="stroke-border"/>
              <Bar dataKey="profit" name="Profit" barSize={11} radius={[0, 3, 3, 0]}>
                {compData.map((e, i) => (
                  <Cell
                    key={i}
                    className={e.profit >= 0 ? "fill-accent" : "fill-destructive"}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-xs text-muted-foreground">
            Aucun skin
          </div>
        )}
      </div>
    </div>
  )
}
