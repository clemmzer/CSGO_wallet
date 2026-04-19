"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, Check, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { WEAR_MAP, WEAR_ORDER, COLORS, fetchSteamPrice } from "./index"
import type { SkinData, PortfolioSkin, Weapon } from "./index"

interface AddSkinPanelProps {
  onAdd: (skin: Omit<PortfolioSkin, "id">) => void
  allSkins: SkinData[]
  loadingDB: boolean
  dbError: string | null
}

interface WeaponDropdownProps {
  weapons: Weapon[]
  value: Weapon | null
  onChange: (weapon: Weapon) => void
}

function WeaponDropdown({ weapons, value, onChange }: WeaponDropdownProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const inp = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inp.current?.focus(), 60)
  }, [open])

  const list = q
    ? weapons.filter(w => w.name.toLowerCase().includes(q.toLowerCase()))
    : weapons

  return (
    <div className="relative w-full mb-3.5" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); setQ("") }}
        className={`w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between transition-colors hover:border-muted-foreground/50 ${
          value ? "text-foreground" : "text-muted-foreground"
        } ${open ? "border-muted-foreground/50" : ""}`}
      >
        <span>{value?.name || "Sélectionner une arme..."}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}/>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg z-50 overflow-hidden shadow-lg animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="p-2 border-b border-border">
            <Input
              ref={inp}
              placeholder="AK-47, AWP, Glock..."
              value={q}
              onChange={e => setQ(e.target.value)}
              onClick={e => e.stopPropagation()}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {list.length === 0 && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Aucun résultat
              </div>
            )}
            {list.map(w => (
              <div
                key={w.id}
                onClick={() => { onChange(w); setOpen(false); setQ("") }}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-muted ${
                  value?.id === w.id ? "text-accent" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {w.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function AddSkinPanel({ onAdd, allSkins, loadingDB, dbError }: AddSkinPanelProps) {
  const [selW, setSelW] = useState<Weapon | null>(null)
  const [skinQ, setSkinQ] = useState("")
  const [selS, setSelS] = useState<SkinData | null>(null)
  const [selWr, setSelWr] = useState<string | null>(null)
  const [buy, setBuy] = useState("")
  const [mktP, setMktP] = useState<number | null>(null)
  const [fetching, setFetching] = useState(false)
  const [pErr, setPErr] = useState<string | null>(null)
  const [rawN, setRawN] = useState("")

  const weapons = [
    ...new Map(allSkins.map(s => [s.weapon.name, s.weapon])).values()
  ].sort((a, b) => a.name.localeCompare(b.name))

  const skins4W = selW
    ? allSkins.filter(s =>
        s.weapon.name === selW.name &&
        (skinQ === "" || s.name.toLowerCase().includes(skinQ.toLowerCase()))
      )
    : []

  useEffect(() => {
    if (!selS || !selWr) {
      setMktP(null)
      setPErr(null)
      return
    }
    const name = `${selS.name} (${selWr})`
    setRawN(name)
    setFetching(true)
    setPErr(null)
    setMktP(null)
    fetchSteamPrice(name)
      .then(p => setMktP(p))
      .catch(e => setPErr(e.message))
      .finally(() => setFetching(false))
  }, [selS, selWr])

  const step = !selW ? 1 : !selS ? 2 : !selWr ? 3 : 4

  const resetW = (w: Weapon | null) => {
    setSelW(w)
    setSelS(null)
    setSelWr(null)
    setSkinQ("")
    setMktP(null)
    setBuy("")
    setPErr(null)
  }

  const buyN = parseFloat(buy) || 0
  const profit = mktP != null ? mktP - buyN : null
  const pct = buyN > 0 && profit != null ? (profit / buyN) * 100 : null
  const canAdd = selS && selWr && buyN > 0

  const handleAdd = () => {
    if (!canAdd || !selS || !selW) return
    onAdd({
      weapon: selW.name,
      name: `${selS.name.split("|")[1]?.trim() ?? selS.name} ${WEAR_MAP[selWr] ?? ""}`.trim(),
      fullName: rawN,
      buy: buyN,
      marketPrice: mktP,
      image: selS.image,
      rarity: selS.rarity,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    })
    resetW(null)
  }

  const steps = ["Arme", "Skin", "Usure", "Prix"]

  return (
    <>
      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pb-3 mb-3 border-b border-border/50">
        Ajouter un skin
      </h3>

      {/* Steps bar */}
      <div className="grid grid-cols-4 gap-px bg-border rounded-lg overflow-hidden mb-3.5">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`bg-card py-2 text-center text-[10px] font-semibold uppercase tracking-wide transition-colors ${
              step > i + 1
                ? "text-accent bg-accent/5"
                : step === i + 1
                ? "text-foreground bg-muted"
                : "text-muted-foreground/40"
            }`}
          >
            <span className="block text-base font-bold mb-0.5">
              {step > i + 1 ? <Check className="w-4 h-4 mx-auto"/> : i + 1}
            </span>
            {s}
          </div>
        ))}
      </div>

      {loadingDB && (
        <div className="flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin text-accent"/>
          <span className="text-xs text-muted-foreground">Chargement...</span>
        </div>
      )}

      {dbError && <p className="text-xs text-destructive mt-1">{dbError}</p>}

      {!loadingDB && !dbError && (
        <>
          {/* Step 1: Weapon */}
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
            {selW ? (
              <span className="text-accent">
                ✓ {selW.name}{" "}
                <button
                  onClick={() => resetW(null)}
                  className="underline text-muted-foreground hover:text-foreground ml-1"
                >
                  changer
                </button>
              </span>
            ) : (
              "Arme"
            )}
          </label>
          {!selW && <WeaponDropdown weapons={weapons} value={selW} onChange={resetW}/>}
          {selW && (
            <div className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground mb-3.5">
              {selW.name}
            </div>
          )}

          {/* Step 2: Skin */}
          {selW && (
            <>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                {selS ? (
                  <span className="text-accent">
                    ✓ {selS.name.split("|")[1]?.trim()}{" "}
                    <button
                      onClick={() => {
                        setSelS(null)
                        setSelWr(null)
                        setMktP(null)
                      }}
                      className="underline text-muted-foreground hover:text-foreground ml-1"
                    >
                      changer
                    </button>
                  </span>
                ) : (
                  `Skin (${skins4W.length})`
                )}
              </label>
              {!selS && (
                <>
                  <Input
                    placeholder="Rechercher un skin..."
                    value={skinQ}
                    onChange={e => setSkinQ(e.target.value)}
                    className="mb-2 h-9"
                  />
                  <div className="max-h-[200px] overflow-y-auto border border-border rounded-lg overflow-x-hidden mb-3">
                    {skins4W.map(s => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setSelS(s)
                          setSelWr(null)
                          setMktP(null)
                        }}
                        className="flex items-center gap-2 px-2.5 py-2 cursor-pointer transition-colors hover:bg-muted border-b border-border/50 last:border-b-0"
                      >
                        {s.image && (
                          <img src={s.image} alt="" className="w-11 h-[30px] object-contain flex-shrink-0"/>
                        )}
                        <div>
                          <div className="text-xs font-medium text-foreground">
                            {s.name.split("|")[1]?.trim()}
                          </div>
                          <div
                            className="text-[10px] mt-0.5"
                            style={{ color: s.rarity?.color ?? undefined }}
                          >
                            {s.rarity?.name}
                          </div>
                        </div>
                      </div>
                    ))}
                    {skins4W.length === 0 && (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        Aucun résultat
                      </div>
                    )}
                  </div>
                </>
              )}
              {selS && (
                <div className="flex items-center gap-2 px-2.5 py-2 bg-card border border-border rounded-lg mb-3.5">
                  {selS.image && (
                    <img src={selS.image} alt="" className="w-10 h-7 object-contain rounded"/>
                  )}
                  <span className="text-xs font-medium text-foreground">
                    {selS.name.split("|")[1]?.trim()}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Step 3: Wear */}
          {selS && (
            <>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                {selWr ? (
                  <span className="text-accent">
                    ✓ {selWr}{" "}
                    <button
                      onClick={() => setSelWr(null)}
                      className="underline text-muted-foreground hover:text-foreground ml-1"
                    >
                      changer
                    </button>
                  </span>
                ) : (
                  "Usure"
                )}
              </label>
              {!selWr && (
                <div className="grid grid-cols-5 gap-1 mb-3">
                  {WEAR_ORDER.map(w => {
                    const ok = selS.wears?.some(sw => sw.name === w)
                    return (
                      <button
                        key={w}
                        onClick={() => ok && setSelWr(w)}
                        disabled={!ok}
                        className={`py-2 rounded-md border text-center font-mono text-[11px] font-medium transition-colors ${
                          !ok
                            ? "opacity-20 cursor-not-allowed border-border text-muted-foreground bg-card"
                            : "border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground bg-card"
                        }`}
                      >
                        <div className="text-sm font-bold">{WEAR_MAP[w]}</div>
                      </button>
                    )
                  })}
                </div>
              )}
              {selWr && (
                <div className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-muted-foreground mb-3.5">
                  {selWr}
                </div>
              )}
            </>
          )}

          {/* Step 4: Price */}
          {selWr && (
            <>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-card border border-border rounded-lg p-3">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Ton achat
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={buy}
                    onChange={e => setBuy(e.target.value)}
                    className="h-9"
                  />
                  {buyN > 0 && (
                    <div className="font-mono text-base font-medium text-accent mt-1.5">
                      {buyN.toFixed(2)} €
                    </div>
                  )}
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Steam
                  </label>
                  {fetching && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Loader2 className="w-3 h-3 animate-spin text-accent"/>
                      <span className="text-xs text-muted-foreground">...</span>
                    </div>
                  )}
                  {!fetching && mktP != null && (
                    <div className="font-mono text-base font-medium text-accent mt-1.5">
                      {mktP.toFixed(2)} €
                    </div>
                  )}
                  {!fetching && pErr && (
                    <p className="text-xs text-destructive mt-1">{pErr}</p>
                  )}
                  <div className="text-[9px] text-muted-foreground/40 mt-1 break-all">
                    {rawN}
                  </div>
                </div>
              </div>

              {/* Comparison bar */}
              {buyN > 0 && mktP != null && profit != null && pct != null && (
                <div className="bg-card border border-border rounded-lg p-3 mb-3">
                  <div className="flex justify-between items-center mb-2 text-[11px]">
                    <span className="text-muted-foreground/60">Achat vs marché</span>
                    <span
                      className={`font-mono font-medium ${
                        profit >= 0 ? "text-accent" : "text-destructive"
                      }`}
                    >
                      {profit >= 0 ? "+" : ""}{profit.toFixed(2)} € ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-1 bg-border rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        profit >= 0 ? "bg-accent" : "bg-destructive"
                      }`}
                      style={{
                        width: `${Math.min(100, (Math.min(buyN, mktP) / Math.max(buyN, mktP)) * 100)}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-muted-foreground">Achat {buyN.toFixed(2)} €</span>
                    <span className="text-accent">Marché {mktP.toFixed(2)} €</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleAdd}
                disabled={!canAdd}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {canAdd ? "Ajouter au portefeuille" : "Saisissez un prix d'achat"}
              </Button>
            </>
          )}
        </>
      )}
    </>
  )
}
