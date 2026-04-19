"use client"

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    color?: string
    stroke?: string
    name: string
    value: number
  }>
  label?: string
}

export function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg font-mono">
      <p className="text-muted-foreground text-[10px] font-sans font-medium mb-1.5">
        {label}
      </p>
      {payload.map((p, i) => (
        <p
          key={i}
          className="text-[11px] my-0.5"
          style={{ color: p.color || p.stroke || "var(--foreground)" }}
        >
          {p.name}: {Number(p.value).toFixed(2)} €
        </p>
      ))}
    </div>
  )
}
