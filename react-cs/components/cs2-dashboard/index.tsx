"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { TopBar } from "./top-bar"
import { Sidebar } from "./sidebar"
import { MainContent } from "./main-content"

// Config
const SKINS_API = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json"
const PROXY = process.env.NEXT_PUBLIC_STEAM_PROXY_URL || "http://localhost:3001"
const STEAM_URL = (n: string) => `${PROXY}/steam-price?name=${encodeURIComponent(n)}`
const HIST_URL = (n?: string) => n ? `${PROXY}/price-history?name=${encodeURIComponent(n)}` : `${PROXY}/price-history`
const RECORD_URL = `${PROXY}/record-prices`
const AUTO_MS = 30 * 60 * 1000

export const WEAR_MAP: Record<string, string> = {
  "Factory New": "FN",
  "Minimal Wear": "MW",
  "Field-Tested": "FT",
  "Well-Worn": "WW",
  "Battle-Scarred": "BS"
}

export const WEAR_ORDER = ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"]

export const COLORS = [
  "#00ff87", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#10b981", "#f97316", "#a78bfa"
]

export const RANGES = [
  { key: "1h", label: "1H", ms: 3600000 },
  { key: "24h", label: "24H", ms: 86400000 },
  { key: "7d", label: "7J", ms: 604800000 },
  { key: "30d", label: "30J", ms: 2592000000 },
  { key: "all", label: "MAX", ms: Infinity },
]

export interface Weapon {
  id: string
  name: string
}

export interface Rarity {
  id: string
  name: string
  color: string
}

export interface WearInfo {
  id: string
  name: string
}

export interface SkinData {
  id: string
  name: string
  weapon: Weapon
  image?: string
  rarity?: Rarity
  wears?: WearInfo[]
}

export interface PortfolioSkin {
  id: number
  weapon: string
  name: string
  fullName: string
  buy: number
  marketPrice: number | null
  image?: string
  rarity?: Rarity
  color: string
}

export interface HistoryPoint {
  t: number
  p: number
}

export type HistoryData = Record<string, HistoryPoint[]>

// Helpers
export function parseSteamPrice(raw: string | null): number | null {
  if (!raw) return null
  const c = raw.replace(/\s/g, "").replace(/[^\d.,]/g, "")
  const n = c.includes(",") && c.includes(".") ? c.replace(".", "").replace(",", ".") : c.replace(",", ".")
  return parseFloat(n) || null
}

export async function fetchSteamPrice(name: string): Promise<number | null> {
  const r = await fetch(STEAM_URL(name))
  if (!r.ok) throw new Error(`Proxy ${r.status}`)
  const d = await r.json()
  if (d.error) throw new Error(d.error)
  if (!d.success) throw new Error("Introuvable.")
  return parseSteamPrice(d.lowest_price ?? d.median_price)
}

export function fmtTime(ts: number, range: string): string {
  const d = new Date(ts)
  if (range === "1h" || range === "24h") {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  }
  if (range === "7d") {
    return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })
  }
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
}

export function fmt(n: number | null | undefined, decimals = 2): string {
  return n != null ? n.toFixed(decimals) : "—"
}

export default function CS2Dashboard() {
  const [portfolio, setPortfolio] = useState<PortfolioSkin[]>([])
  const [tab, setTab] = useState("valeur")
  const [range, setRange] = useState("all")
  const [wFilter, setWFilter] = useState("Tout")
  const [hidden, setHidden] = useState<Record<number, boolean>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [history, setHistory] = useState<HistoryData>({})
  const [lastRef, setLastRef] = useState<Date | null>(null)
  const [allSkins, setAllSkins] = useState<SkinData[]>([])
  const [loadDB, setLoadDB] = useState(false)
  const [dbErr, setDbErr] = useState<string | null>(null)
  const [autoEnabled, setAutoEnabled] = useState(true)
  const [countdown, setCountdown] = useState(AUTO_MS)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load skins database
  useEffect(() => {
    setLoadDB(true)
    fetch(SKINS_API)
      .then(r => r.json())
      .then((d: SkinData[]) => setAllSkins(d.filter(s => s.name && s.weapon?.name)))
      .catch(() => setDbErr("Impossible de charger la base."))
      .finally(() => setLoadDB(false))
  }, [])

  // Load history
  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch(HIST_URL())
      if (r.ok) setHistory(await r.json())
    } catch {
      // Ignore errors
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Record prices
  const recordPrices = useCallback(async () => {
    if (!portfolio.length) return
    setRefreshing(true)
    try {
      const r = await fetch(RECORD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skins: portfolio.map(s => s.fullName) })
      })
      if (r.ok) {
        const d = await r.json()
        setPortfolio(p => p.map(s => {
          const rr = d.recorded[s.fullName]
          return rr?.success ? { ...s, marketPrice: rr.price } : s
        }))
        await loadHistory()
        setLastRef(new Date())
        setCountdown(AUTO_MS)
      }
    } catch {
      // Ignore errors
    }
    setRefreshing(false)
  }, [portfolio, loadHistory])

  // Auto refresh timer
  useEffect(() => {
    if (!portfolio.length || !autoEnabled) {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      return
    }

    timerRef.current = setInterval(recordPrices, AUTO_MS)
    countdownRef.current = setInterval(() => {
      setCountdown(c => Math.max(0, c - 1000))
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [portfolio.length, recordPrices, autoEnabled])

  // Reset countdown when toggling auto
  useEffect(() => {
    if (autoEnabled) {
      setCountdown(AUTO_MS)
    }
  }, [autoEnabled])

  const addSkin = useCallback((skin: Omit<PortfolioSkin, "id">) => {
    setPortfolio(p => [...p, { ...skin, id: Date.now() }])
    setTimeout(loadHistory, 600)
  }, [loadHistory])

  const delSkin = (id: number) => {
    setPortfolio(p => p.filter(s => s.id !== id))
    setHidden(h => {
      const n = { ...h }
      delete n[id]
      return n
    })
  }

  const toggleHide = (id: number) => setHidden(h => ({ ...h, [id]: !h[id] }))
  const toggleAuto = () => setAutoEnabled(a => !a)

  // Derived values
  const weapons = ["Tout", ...Array.from(new Set(portfolio.map(s => s.weapon)))]
  const active = wFilter === "Tout" ? portfolio : portfolio.filter(s => s.weapon === wFilter)
  const totalBuy = active.reduce((a, s) => a + s.buy, 0)
  const totalMarket = active.reduce((a, s) => a + (s.marketPrice ?? s.buy), 0)
  const profit = totalMarket - totalBuy
  const pct = totalBuy > 0 ? (profit / totalBuy) * 100 : 0

  // Timeline
  const now = Date.now()
  const rangeMs = RANGES.find(r => r.key === range)?.ms ?? Infinity
  const cutoff = rangeMs === Infinity ? 0 : now - rangeMs

  const buildTimeline = () => {
    const allTs = new Set<number>()
    active.forEach(s => {
      (history[s.fullName] || []).forEach(p => {
        if (p.t >= cutoff) allTs.add(p.t)
      })
    })
    const sorted = [...allTs].sort((a, b) => a - b)
    if (!sorted.length) return []
    
    return sorted.map(t => {
      const pt: Record<string, unknown> = { time: t, label: fmtTime(t, range) }
      let tot = 0, ref = 0
      active.forEach(s => {
        if (hidden[s.id]) return
        const h = history[s.fullName] || []
        const before = h.filter(p => p.t <= t)
        const p = before.length ? before[before.length - 1].p : (s.marketPrice ?? s.buy)
        tot += p
        ref += s.buy
        pt[s.name] = p
      })
      pt.valeur = tot
      pt.profit = tot - ref
      pt.ref = ref
      return pt
    })
  }

  const timeline = buildTimeline()
  const hasHist = timeline.length > 1
  const firstVal = timeline.length ? (timeline[0].valeur as number) : totalMarket
  const lastVal = timeline.length ? (timeline[timeline.length - 1].valeur as number) : totalMarket
  const chgAbs = lastVal - firstVal
  const chgPct = firstVal > 0 ? (chgAbs / firstVal) * 100 : 0
  const isUp = chgAbs >= 0

  const compData = active.filter(s => !hidden[s.id]).map(s => ({
    name: s.name.length > 13 ? s.name.slice(0, 11) + "…" : s.name,
    achat: s.buy,
    marche: s.marketPrice ?? s.buy,
    profit: (s.marketPrice ?? s.buy) - s.buy,
    color: s.color,
  }))

  const totalPts = Object.values(history).reduce((a, h) => a + h.length, 0)

  const formatCountdown = () => {
    const mins = Math.floor(countdown / 60000)
    const secs = Math.floor((countdown % 60000) / 1000)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="grid grid-rows-[52px_1fr] grid-cols-[300px_1fr] h-screen w-screen overflow-hidden">
      <TopBar
        lastRef={lastRef}
        refreshing={refreshing}
        onRefresh={recordPrices}
        autoEnabled={autoEnabled}
        onToggleAuto={toggleAuto}
        countdown={formatCountdown()}
        portfolio={portfolio}
      />
      <Sidebar
        allSkins={allSkins}
        loadingDB={loadDB}
        dbError={dbErr}
        portfolio={portfolio}
        onAdd={addSkin}
        onDelete={delSkin}
        onToggleHide={toggleHide}
        hidden={hidden}
        weapons={weapons}
        wFilter={wFilter}
        onFilterChange={setWFilter}
      />
      <MainContent
        portfolio={portfolio}
        active={active}
        totalBuy={totalBuy}
        totalMarket={totalMarket}
        profit={profit}
        pct={pct}
        totalPts={totalPts}
        tab={tab}
        onTabChange={setTab}
        range={range}
        onRangeChange={setRange}
        timeline={timeline}
        hasHist={hasHist}
        lastVal={lastVal}
        chgAbs={chgAbs}
        chgPct={chgPct}
        isUp={isUp}
        compData={compData}
        hidden={hidden}
        onToggleHide={toggleHide}
      />
    </div>
  )
}
