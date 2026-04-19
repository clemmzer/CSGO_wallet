import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const SKINS_API  = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";
const PROXY      = import.meta.env.VITE_STEAM_PROXY_URL || "http://localhost:3001";
const STEAM_URL  = (n) => `${PROXY}/steam-price?name=${encodeURIComponent(n)}`;
const HIST_URL   = (n) => n ? `${PROXY}/price-history?name=${encodeURIComponent(n)}` : `${PROXY}/price-history`;
const RECORD_URL = `${PROXY}/record-prices`;
const AUTO_MS    = 30 * 60 * 1000;

const WEAR_MAP   = { "Factory New":"FN","Minimal Wear":"MW","Field-Tested":"FT","Well-Worn":"WW","Battle-Scarred":"BS" };
const WEAR_ORDER = ["Factory New","Minimal Wear","Field-Tested","Well-Worn","Battle-Scarred"];
const COLORS     = ["#00ff87","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#10b981","#f97316","#a78bfa"];

const RANGES = [
  { key:"1h",  label:"1H",  ms:3600000 },
  { key:"24h", label:"24H", ms:86400000 },
  { key:"7d",  label:"7J",  ms:604800000 },
  { key:"30d", label:"30J", ms:2592000000 },
  { key:"all", label:"MAX", ms:Infinity },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
function parseSteamPrice(raw) {
  if (!raw) return null;
  const c = raw.replace(/\s/g,"").replace(/[^\d.,]/g,"");
  const n = c.includes(",") && c.includes(".") ? c.replace(".","").replace(",",".") : c.replace(",",".");
  return parseFloat(n) || null;
}
async function fetchSteamPrice(name) {
  const r = await fetch(STEAM_URL(name));
  if (!r.ok) throw new Error(`Proxy ${r.status}`);
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  if (!d.success) throw new Error("Introuvable.");
  return parseSteamPrice(d.lowest_price ?? d.median_price);
}
function fmtTime(ts, range) {
  const d = new Date(ts);
  if (range==="1h"||range==="24h") return d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  if (range==="7d") return d.toLocaleDateString("fr-FR",{weekday:"short",day:"numeric"});
  return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"});
}
function fmt(n, decimals=2) {
  return n != null ? n.toFixed(decimals) : "—";
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #root {
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: #0a0a0a;
  font-family: 'Inter', -apple-system, sans-serif;
  color: #f5f5f5;
  -webkit-font-smoothing: antialiased;
}

/* ── LAYOUT: topbar + two-col ── */
.shell {
  display: grid;
  grid-template-rows: 52px 1fr;
  grid-template-columns: 300px 1fr;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* ── TOPBAR ── */
.topbar {
  grid-column: 1 / -1;
  grid-row: 1;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid #1a1a1a;
  background: #0a0a0a;
  gap: 12px;
  z-index: 50;
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  letter-spacing: -0.01em;
}
.logo-mark {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.topbar-sep { width: 1px; height: 20px; background: #1e1e1e; margin: 0 4px; }
.topbar-label { font-size: 12px; color: #666; font-weight: 400; }
.ms-left { margin-left: auto; }
.badge-live {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 6px;
  border: 1px solid #1e1e1e; background: #111;
  font-size: 11px; font-weight: 500; color: #888;
}
.dot-live { width: 6px; height: 6px; border-radius: 50%; background: #00ff87; animation: blink 2s infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
.btn-top {
  height: 30px; padding: 0 12px; border-radius: 6px;
  border: 1px solid #222; background: #111;
  color: #aaa; font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all .15s; white-space: nowrap;
}
.btn-top:hover { border-color: #333; color: #fff; background: #161616; }
.btn-top:disabled { opacity: .4; cursor: not-allowed; }

/* ── SIDEBAR ── */
.sidebar {
  grid-column: 1;
  grid-row: 2;
  border-right: 1px solid #1a1a1a;
  background: #0a0a0a;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #1e1e1e transparent;
}
.sidebar-inner { padding: 16px; }

/* ── MAIN ── */
.main {
  grid-column: 2;
  grid-row: 2;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #1e1e1e transparent;
  padding: 20px 24px;
  background: #0a0a0a;
}

/* ── SECTION HEADER ── */
.sec-head {
  font-size: 11px; font-weight: 600; color: #666;
  text-transform: uppercase; letter-spacing: .08em;
  padding-bottom: 12px; margin-bottom: 12px;
  border-bottom: 1px solid #141414;
}

/* ── KPI STRIP ── */
.kpi-strip { display: grid; grid-template-columns: repeat(4,1fr); gap: 1px; background: #1a1a1a; border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
.kpi-cell { background: #0f0f0f; padding: 16px 18px; }
.kpi-cell-label { font-size: 11px; font-weight: 500; color: #888; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 8px; }
.kpi-cell-val { font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 500; color: #fff; line-height: 1; }
.kpi-cell-sub { font-size: 11px; color: #666; margin-top: 5px; }

/* ── CARD ── */
.card {
  background: #0f0f0f;
  border: 1px solid #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
}
.card-pad { padding: 16px 18px; }
.card-title { font-size: 11px; font-weight: 600; color: #777; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 14px; }

/* ── CHART HEADER ── */
.chart-top { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 18px 0; gap: 12px; flex-wrap: wrap; }
.price-big { font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 500; color: #fff; line-height: 1; }
.price-chip {
  display: inline-block; padding: 3px 8px; border-radius: 5px;
  font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 500;
}
.chip-up { color: #00ff87; background: rgba(0,255,135,0.08); }
.chip-dn { color: #ff4d4d; background: rgba(255,77,77,0.08); }
.chart-controls { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.tab-row { display: flex; gap: 2px; background: #141414; border-radius: 7px; padding: 2px; }
.t-btn {
  padding: 5px 12px; border-radius: 5px; border: none;
  background: transparent; color: #555;
  font-size: 12px; font-weight: 500; cursor: pointer; transition: all .12s;
}
.t-btn.on { background: #1e1e1e; color: #fff; }
.t-btn:hover:not(.on) { color: #aaa; }
.range-row { display: flex; gap: 2px; }
.r-btn {
  padding: 4px 9px; border-radius: 5px; border: 1px solid transparent;
  background: transparent; color: #444;
  font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 500;
  cursor: pointer; transition: all .12s;
}
.r-btn.on { border-color: #2a2a2a; color: #00ff87; background: rgba(0,255,135,0.05); }
.r-btn:hover:not(.on) { color: #888; }

/* ── LEGEND ── */
.leg-row { display: flex; flex-wrap: wrap; gap: 12px; padding: 10px 18px 0; }
.leg-it { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 500; color: #555; cursor: pointer; user-select: none; transition: opacity .12s; }
.leg-it.dim { opacity: .3; }
.leg-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
.chart-area { padding: 12px 0 0; }

/* ── CHART EMPTY ── */
.chart-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 220px; gap: 8px; color: #333; text-align: center; }
.chart-empty .e-icon { font-size: 36px; margin-bottom: 4px; }
.chart-empty p { font-size: 12px; line-height: 1.6; max-width: 280px; }

/* ── BOTTOM GRID ── */
.bot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }

/* ── STATS MINI GRID ── */
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #1a1a1a; border-radius: 8px; overflow: hidden; margin-bottom: 14px; }
.stat-cell { background: #0f0f0f; padding: 12px 14px; }
.stat-label { font-size: 10px; font-weight: 600; color: #777; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 5px; }
.stat-val { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 500; color: #fff; }

/* ── PERF LIST ── */
.perf-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #141414; }
.perf-item:last-child { border-bottom: none; }
.perf-rank { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #666; width: 18px; flex-shrink: 0; }
.perf-name { font-size: 12px; font-weight: 500; color: #ccc; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.perf-val { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 500; }

/* ── SKIN LIST ── */
.skin-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; cursor: pointer; transition: background .12s; border: 1px solid transparent; }
.skin-item:hover { background: #111; border-color: #1e1e1e; }
.skin-item.dim { opacity: .3; }
.skin-item-info { flex: 1; min-width: 0; }
.skin-item-name { font-size: 12px; font-weight: 500; color: #ddd; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.skin-item-sub { font-size: 10px; color: #666; margin-top: 2px; }
.skin-item-price { text-align: right; flex-shrink: 0; }
.skin-price-val { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 500; color: #ccc; }
.skin-price-delta { font-family: 'JetBrains Mono', monospace; font-size: 10px; }
.skin-del { width: 24px; height: 24px; border-radius: 5px; border: 1px solid #1e1e1e; background: transparent; color: #333; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; transition: all .12s; }
.skin-del:hover { border-color: #ff4d4d; color: #ff4d4d; background: rgba(255,77,77,0.05); }

/* ── FILTER PILLS ── */
.f-pills { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
.f-pill { padding: 3px 10px; border-radius: 5px; border: 1px solid #1e1e1e; background: transparent; color: #555; font-size: 11px; font-weight: 500; cursor: pointer; transition: all .12s; }
.f-pill.on { border-color: #2a2a2a; color: #00ff87; background: rgba(0,255,135,0.06); }
.f-pill:hover:not(.on) { color: #888; border-color: #222; }

/* ── ADD FORM ── */
.steps-bar { display: grid; grid-template-columns: repeat(4,1fr); gap: 1px; background: #1a1a1a; border-radius: 8px; overflow: hidden; margin-bottom: 14px; }
.step-c { background: #0f0f0f; padding: 8px; text-align: center; font-size: 10px; font-weight: 600; color: #333; text-transform: uppercase; letter-spacing: .06em; transition: all .15s; }
.step-c.done { color: #00ff87; background: rgba(0,255,135,0.04); }
.step-c.active { color: #fff; background: #141414; }
.step-n { display: block; font-size: 15px; font-weight: 700; margin-bottom: 2px; }

.f-label { font-size: 10px; font-weight: 600; color: #777; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 5px; }
.f-inp {
  width: 100%; background: #111; border: 1px solid #1e1e1e; border-radius: 8px;
  padding: 8px 11px; color: #f5f5f5; font-family: 'Inter', sans-serif; font-size: 13px;
  outline: none; transition: border-color .15s;
}
.f-inp:focus { border-color: #2a2a2a; }
.f-inp::placeholder { color: #333; }

/* ── DROPDOWN ── */
.dd { position: relative; width: 100%; margin-bottom: 14px; }
.dd-trigger {
  width: 100%; background: #111; border: 1px solid #1e1e1e; border-radius: 8px;
  padding: 8px 11px; color: #aaa; font-size: 13px; cursor: pointer;
  display: flex; align-items: center; justify-content: space-between;
  transition: border-color .15s; text-align: left;
}
.dd-trigger.has-val { color: #f5f5f5; }
.dd-trigger:hover, .dd-trigger.open { border-color: #2a2a2a; }
.dd-arrow { font-size: 10px; color: #333; transition: transform .2s; flex-shrink: 0; }
.dd-arrow.open { transform: rotate(180deg); }
.dd-menu {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: #111; border: 1px solid #222; border-radius: 10px;
  z-index: 200; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.8);
  animation: fadeIn .12s ease;
}
@keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
.dd-search { padding: 8px; border-bottom: 1px solid #1a1a1a; }
.dd-search input {
  width: 100%; background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 6px;
  padding: 7px 10px; color: #f5f5f5; font-size: 12px; outline: none;
  transition: border-color .15s;
}
.dd-search input:focus { border-color: #2a2a2a; }
.dd-search input::placeholder { color: #333; }
.dd-list { max-height: 200px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #1a1a1a transparent; }
.dd-opt { padding: 8px 12px; font-size: 12px; font-weight: 500; color: #777; cursor: pointer; transition: all .1s; }
.dd-opt:hover { background: #161616; color: #f5f5f5; }
.dd-opt.sel { color: #00ff87; }
.dd-empty { padding: 14px; text-align: center; font-size: 11px; color: #333; }

/* ── SKIN OPTS ── */
.skin-opts { max-height: 200px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #1a1a1a transparent; margin-bottom: 12px; border: 1px solid #1a1a1a; border-radius: 8px; overflow-x: hidden; }
.sk-opt { display: flex; align-items: center; gap: 8px; padding: 7px 10px; cursor: pointer; transition: background .1s; border-bottom: 1px solid #141414; }
.sk-opt:last-child { border-bottom: none; }
.sk-opt:hover { background: #141414; }
.sk-opt img { width: 44px; height: 30px; object-fit: contain; flex-shrink: 0; }
.sk-opt-name { font-size: 12px; font-weight: 500; color: #ccc; }
.sk-opt-rare { font-size: 10px; margin-top: 1px; }

/* ── WEAR ── */
.wear-row { display: grid; grid-template-columns: repeat(5,1fr); gap: 4px; margin-bottom: 12px; }
.w-btn { padding: 8px 2px; border-radius: 6px; border: 1px solid #1a1a1a; background: #0f0f0f; color: #444; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 500; cursor: pointer; text-align: center; transition: all .12s; }
.w-btn:hover:not(.na) { border-color: #222; color: #888; }
.w-btn.sel { border-color: #2a2a2a; background: rgba(0,255,135,0.06); color: #00ff87; }
.w-btn.na { opacity: .2; cursor: not-allowed; }

/* ── PRICE BOXES ── */
.p-boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.p-box { background: #111; border: 1px solid #1a1a1a; border-radius: 8px; padding: 11px 13px; }
.p-box-lbl { font-size: 10px; font-weight: 600; color: #777; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 7px; }
.p-box-val { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 500; }

/* ── COMPARE BAR ── */
.cmp { background: #111; border: 1px solid #1a1a1a; border-radius: 8px; padding: 11px 13px; margin-bottom: 12px; }
.cmp-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 11px; }
.cmp-lbl { color: #444; }
.cmp-track { height: 4px; background: #1a1a1a; border-radius: 2px; overflow: hidden; margin-bottom: 6px; }
.cmp-fill { height: 100%; border-radius: 2px; transition: width .5s; }
.cmp-labs { display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 10px; }

/* ── BTN ADD ── */
.btn-add {
  width: 100%; padding: 10px; border-radius: 8px; border: none;
  background: #00ff87; color: #0a0a0a;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: opacity .15s;
  letter-spacing: -.01em;
}
.btn-add:hover:not(:disabled) { opacity: .9; }
.btn-add:disabled { opacity: .3; cursor: not-allowed; }

.btn-lnk { background: none; border: none; color: #444; cursor: pointer; font-size: 10px; text-decoration: underline; padding: 0; }
.btn-lnk:hover { color: #888; }
.spin { width: 12px; height: 12px; border: 1.5px solid #1a1a1a; border-top-color: #00ff87; border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
.err-txt { font-size: 11px; color: #ff4d4d; margin-top: 4px; }
.muted { font-size: 11px; color: #666; }
.mb8 { margin-bottom: 8px; }
.mb12 { margin-bottom: 12px; }
.mb16 { margin-bottom: 16px; }
.divider { height: 1px; background: #141414; margin: 14px 0; }

/* ── RECHARTS: kill white backgrounds ── */
.recharts-wrapper { background: transparent !important; }
.recharts-surface { overflow: visible; background: transparent !important; }
.recharts-tooltip-cursor { fill: rgba(255,255,255,0.03) !important; stroke: none !important; }
.recharts-area-area { fill-opacity: 1; }
.recharts-cartesian-grid rect { display: none !important; }
`;


// ── DROPDOWN ─────────────────────────────────────────────────────────────────
function WeaponDropdown({ weapons, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const inp = useRef(null);

  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => { if (open) setTimeout(() => inp.current?.focus(), 60); }, [open]);

  const list = q ? weapons.filter(w => w.name.toLowerCase().includes(q.toLowerCase())) : weapons;

  return (
    <div className="dd" ref={ref}>
      <button className={`dd-trigger${value?" has-val":""}${open?" open":""}`}
        onClick={() => { setOpen(o => !o); setQ(""); }}>
        <span>{value?.name || "Sélectionner une arme..."}</span>
        <span className={`dd-arrow${open?" open":""}`}>▾</span>
      </button>
      {open && (
        <div className="dd-menu">
          <div className="dd-search">
            <input ref={inp} placeholder="AK-47, AWP, Glock..." value={q} onChange={e => setQ(e.target.value)} onClick={e => e.stopPropagation()} />
          </div>
          <div className="dd-list">
            {list.length === 0 && <div className="dd-empty">Aucun résultat</div>}
            {list.map(w => (
              <div key={w.id} className={`dd-opt${value?.id === w.id ? " sel" : ""}`}
                onClick={() => { onChange(w); setOpen(false); setQ(""); }}>
                {w.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── TOOLTIP ───────────────────────────────────────────────────────────────────
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#111",border:"1px solid #222",borderRadius:8,padding:"9px 12px",fontFamily:"'JetBrains Mono',monospace",boxShadow:"0 12px 40px rgba(0,0,0,.8)" }}>
      <p style={{ color:"#555",fontSize:10,marginBottom:6,fontFamily:"'Inter',sans-serif",fontWeight:500 }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color||p.stroke||"#ccc",fontSize:11,margin:"2px 0" }}>
          {p.name}: {Number(p.value).toFixed(2)} €
        </p>
      ))}
    </div>
  );
};

// ── ADD PANEL ─────────────────────────────────────────────────────────────────
function AddPanel({ onAdd, allSkins, loadingDB, dbError }) {
  const [selW, setSelW]       = useState(null);
  const [skinQ, setSkinQ]     = useState("");
  const [selS, setSelS]       = useState(null);
  const [selWr, setSelWr]     = useState(null);
  const [buy, setBuy]         = useState("");
  const [mktP, setMktP]       = useState(null);
  const [fetching, setFetching] = useState(false);
  const [pErr, setPErr]       = useState(null);
  const [rawN, setRawN]       = useState("");

  const weapons = [...new Map(allSkins.map(s => [s.weapon.name, s.weapon])).values()].sort((a,b) => a.name.localeCompare(b.name));
  const skins4W = selW ? allSkins.filter(s => s.weapon.name === selW.name && (skinQ === "" || s.name.toLowerCase().includes(skinQ.toLowerCase()))) : [];

  useEffect(() => {
    if (!selS || !selWr) { setMktP(null); setPErr(null); return; }
    const name = `${selS.name} (${selWr})`;
    setRawN(name); setFetching(true); setPErr(null); setMktP(null);
    fetchSteamPrice(name).then(p => setMktP(p)).catch(e => setPErr(e.message)).finally(() => setFetching(false));
  }, [selS, selWr]);

  const step = !selW ? 1 : !selS ? 2 : !selWr ? 3 : 4;
  const resetW = (w) => { setSelW(w); setSelS(null); setSelWr(null); setSkinQ(""); setMktP(null); setBuy(""); setPErr(null); };
  const buyN = parseFloat(buy) || 0;
  const profit = mktP != null ? mktP - buyN : null;
  const pct = buyN > 0 && profit != null ? (profit / buyN) * 100 : null;
  const canAdd = selS && selWr && buyN > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({ weapon:selW.name, name:`${selS.name.split("|")[1]?.trim() ?? selS.name} ${WEAR_MAP[selWr]??""}`.trim(), fullName:rawN, buy:buyN, marketPrice:mktP, image:selS.image, rarity:selS.rarity, color:COLORS[Math.floor(Math.random()*COLORS.length)] });
    resetW(null);
  };

  return (
    <>
      <div className="sec-head">Ajouter un skin</div>
      <div className="steps-bar">
        {["Arme","Skin","Usure","Prix"].map((s,i) => (
          <div key={s} className={`step-c${step>i+1?" done":step===i+1?" active":""}`}>
            <span className="step-n">{step>i+1?"✓":i+1}</span>{s}
          </div>
        ))}
      </div>

      {loadingDB && <div style={{ display:"flex",alignItems:"center",gap:8 }}><div className="spin"/><span className="muted">Chargement...</span></div>}
      {dbError && <p className="err-txt">{dbError}</p>}
      {!loadingDB && !dbError && <>
        <div className="f-label">
          {selW ? <span style={{ color:"#00ff87" }}>✓ {selW.name} <button className="btn-lnk" onClick={() => resetW(null)}>changer</button></span> : "Arme"}
        </div>
        {!selW && <WeaponDropdown weapons={weapons} value={selW} onChange={resetW} />}
        {selW && <div style={{ padding:"7px 11px",background:"#111",border:"1px solid #1e1e1e",borderRadius:8,fontSize:13,color:"#f5f5f5",marginBottom:14 }}>{selW.name}</div>}

        {selW && <>
          <div className="f-label mb8">
            {selS ? <span style={{ color:"#00ff87" }}>✓ {selS.name.split("|")[1]?.trim()} <button className="btn-lnk" onClick={() => { setSelS(null); setSelWr(null); setMktP(null); }}>changer</button></span> : `Skin (${skins4W.length})`}
          </div>
          {!selS && <>
            <input className="f-inp mb8" placeholder="Rechercher un skin..." value={skinQ} onChange={e => setSkinQ(e.target.value)} />
            <div className="skin-opts">
              {skins4W.map(s => (
                <div key={s.id} className="sk-opt" onClick={() => { setSelS(s); setSelWr(null); setMktP(null); }}>
                  {s.image && <img src={s.image} alt="" />}
                  <div>
                    <div className="sk-opt-name">{s.name.split("|")[1]?.trim()}</div>
                    <div className="sk-opt-rare" style={{ color:s.rarity?.color??"#444" }}>{s.rarity?.name}</div>
                  </div>
                </div>
              ))}
              {skins4W.length === 0 && <div style={{ padding:12,textAlign:"center",fontSize:11,color:"#333" }}>Aucun résultat</div>}
            </div>
          </>}
          {selS && <div style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"#111",borderRadius:8,border:"1px solid #1e1e1e",marginBottom:14 }}>
            {selS.image && <img src={selS.image} style={{ width:40,height:27,objectFit:"contain",borderRadius:4 }} alt=""/>}
            <span style={{ fontSize:12,fontWeight:500,color:"#ccc" }}>{selS.name.split("|")[1]?.trim()}</span>
          </div>}
        </>}

        {selS && <>
          <div className="f-label mb8">
            {selWr ? <span style={{ color:"#00ff87" }}>✓ {selWr} <button className="btn-lnk" onClick={() => setSelWr(null)}>changer</button></span> : "Usure"}
          </div>
          {!selWr && <div className="wear-row">
            {WEAR_ORDER.map(w => {
              const ok = selS.wears?.some(sw => sw.name === w);
              return <button key={w} className={`w-btn${!ok?" na":""}`} onClick={() => ok && setSelWr(w)}><div style={{ fontSize:13,fontWeight:700 }}>{WEAR_MAP[w]}</div></button>;
            })}
          </div>}
          {selWr && <div style={{ padding:"7px 11px",background:"#111",border:"1px solid #1e1e1e",borderRadius:8,fontSize:13,color:"#ccc",marginBottom:14 }}>{selWr}</div>}
        </>}

        {selWr && <>
          <div className="p-boxes">
            <div className="p-box">
              <div className="p-box-lbl">Ton achat</div>
              <input className="f-inp" type="number" step="0.01" placeholder="0.00" value={buy} onChange={e => setBuy(e.target.value)} style={{ fontSize:14 }}/>
              {buyN > 0 && <div className="p-box-val" style={{ color:"#00ff87",marginTop:6,fontSize:16 }}>{buyN.toFixed(2)} €</div>}
            </div>
            <div className="p-box">
              <div className="p-box-lbl">Steam</div>
              {fetching && <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:6 }}><div className="spin"/><span className="muted">...</span></div>}
              {!fetching && mktP != null && <div className="p-box-val" style={{ color:"#00ff87",marginTop:6,fontSize:16 }}>{mktP.toFixed(2)} €</div>}
              {!fetching && pErr && <p className="err-txt">{pErr}</p>}
              <div style={{ fontSize:9,color:"#2a2a2a",marginTop:4,wordBreak:"break-all" }}>{rawN}</div>
            </div>
          </div>
          {buyN > 0 && mktP != null && (
            <div className="cmp">
              <div className="cmp-top">
                <span className="cmp-lbl">Achat vs marché</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:500,color:profit>=0?"#00ff87":"#ff4d4d" }}>
                  {profit>=0?"+":""}{profit.toFixed(2)} € ({pct>=0?"+":""}{pct.toFixed(1)}%)
                </span>
              </div>
              <div className="cmp-track"><div className="cmp-fill" style={{ width:`${Math.min(100,(Math.min(buyN,mktP)/Math.max(buyN,mktP))*100)}%`,background:profit>=0?"#00ff87":"#ff4d4d" }}/></div>
              <div className="cmp-labs">
                <span style={{ color:"#555" }}>Achat {buyN.toFixed(2)} €</span>
                <span style={{ color:"#00ff87" }}>Marché {mktP.toFixed(2)} €</span>
              </div>
            </div>
          )}
          <button className="btn-add" disabled={!canAdd} onClick={handleAdd}>
            {canAdd ? "Ajouter au portefeuille" : "Saisissez un prix d'achat"}
          </button>
        </>}
      </>}
    </>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function CS2Dashboard() {
  const [portfolio, setPortfolio] = useState([]);
  const [tab, setTab]             = useState("valeur");
  const [range, setRange]         = useState("all");
  const [wFilter, setWFilter]     = useState("Tout");
  const [hidden, setHidden]       = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory]     = useState({});
  const [lastRef, setLastRef]     = useState(null);
  const [allSkins, setAllSkins]   = useState([]);
  const [loadDB, setLoadDB]       = useState(false);
  const [dbErr, setDbErr]         = useState(null);
  const injected = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (injected.current) return;
    const s = document.createElement("style");
    s.textContent = CSS;
    document.head.appendChild(s);
    injected.current = true;
  }, []);

  useEffect(() => {
    setLoadDB(true);
    fetch(SKINS_API).then(r => r.json())
      .then(d => setAllSkins(d.filter(s => s.name && s.weapon?.name)))
      .catch(() => setDbErr("Impossible de charger la base."))
      .finally(() => setLoadDB(false));
  }, []);

  const loadHistory = useCallback(async () => {
    try { const r = await fetch(HIST_URL()); if (r.ok) setHistory(await r.json()); } catch {}
  }, []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const recordPrices = useCallback(async () => {
    if (!portfolio.length) return;
    setRefreshing(true);
    try {
      const r = await fetch(RECORD_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ skins:portfolio.map(s => s.fullName) }) });
      if (r.ok) {
        const d = await r.json();
        setPortfolio(p => p.map(s => { const rr = d.recorded[s.fullName]; return rr?.success ? {...s,marketPrice:rr.price} : s; }));
        await loadHistory();
        setLastRef(new Date());
      }
    } catch {}
    setRefreshing(false);
  }, [portfolio, loadHistory]);

  useEffect(() => {
    if (!portfolio.length) return;
    timerRef.current = setInterval(recordPrices, AUTO_MS);
    return () => clearInterval(timerRef.current);
  }, [portfolio.length, recordPrices]);

  const addSkin = useCallback((skin) => {
    setPortfolio(p => [...p, {...skin, id:Date.now()}]);
    setTimeout(loadHistory, 600);
  }, [loadHistory]);
  const delSkin = (id) => {
    setPortfolio(p => p.filter(s => s.id !== id));
    setHidden(h => { const n={...h}; delete n[id]; return n; });
  };
  const toggleHide = (id) => setHidden(h => ({...h,[id]:!h[id]}));

  // ── Derived ─────────────────────────────────────────────────────────────────
  const weapons = ["Tout", ...Array.from(new Set(portfolio.map(s => s.weapon)))];
  const active  = wFilter === "Tout" ? portfolio : portfolio.filter(s => s.weapon === wFilter);
  const totalBuy    = active.reduce((a,s) => a+s.buy, 0);
  const totalMarket = active.reduce((a,s) => a+(s.marketPrice??s.buy), 0);
  const profit  = totalMarket - totalBuy;
  const pct     = totalBuy > 0 ? (profit/totalBuy)*100 : 0;

  // ── Timeline ─────────────────────────────────────────────────────────────────
  const now = Date.now();
  const rangeMs = RANGES.find(r => r.key === range)?.ms ?? Infinity;
  const cutoff  = rangeMs === Infinity ? 0 : now - rangeMs;

  const buildTimeline = () => {
    const allTs = new Set();
    active.forEach(s => { (history[s.fullName]||[]).forEach(p => { if(p.t >= cutoff) allTs.add(p.t); }); });
    const sorted = [...allTs].sort((a,b) => a-b);
    if (!sorted.length) return [];
    return sorted.map(t => {
      const pt = { time:t, label:fmtTime(t, range) };
      let tot=0, ref=0;
      active.forEach(s => {
        if (hidden[s.id]) return;
        const h = history[s.fullName]||[];
        const before = h.filter(p => p.t <= t);
        const p = before.length ? before[before.length-1].p : (s.marketPrice??s.buy);
        tot += p; ref += s.buy; pt[s.name] = p;
      });
      pt.valeur = tot; pt.profit = tot - ref; pt.ref = ref;
      return pt;
    });
  };

  const timeline  = buildTimeline();
  const hasHist   = timeline.length > 1;
  const firstVal  = timeline.length ? timeline[0].valeur : totalMarket;
  const lastVal   = timeline.length ? timeline[timeline.length-1].valeur : totalMarket;
  const chgAbs    = lastVal - firstVal;
  const chgPct    = firstVal > 0 ? (chgAbs/firstVal)*100 : 0;
  const isUp      = chgAbs >= 0;

  const compData  = active.filter(s => !hidden[s.id]).map(s => ({
    name: s.name.length > 13 ? s.name.slice(0,11)+"…" : s.name,
    achat: s.buy, marche: s.marketPrice??s.buy,
    profit: (s.marketPrice??s.buy)-s.buy, color:s.color,
  }));

  const totalPts = Object.values(history).reduce((a,h) => a+h.length, 0);

  return (
    <div className="shell">
      {/* TOPBAR */}
      <header className="topbar">
        <div className="logo">
          <div className="logo-mark">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="28" height="28" rx="7" fill="#0f0f0f" stroke="#1e1e1e" strokeWidth="1"/>
              {/* CS2 crosshair-inspired mark: two overlapping diamonds */}
              <path d="M14 5L19 11H9L14 5Z" fill="#00ff87"/>
              <path d="M14 23L9 17H19L14 23Z" fill="#00ff87" fillOpacity="0.5"/>
              <rect x="11" y="11" width="6" height="6" rx="1" fill="#00ff87" fillOpacity="0.9"/>
            </svg>
          </div>
          CS2 Tracker
        </div>
        <div className="topbar-sep"/>
        <span className="topbar-label">Inventory</span>
        <div className="ms-left" style={{ display:"flex",alignItems:"center",gap:8 }}>
          {lastRef && <span className="muted" style={{ fontSize:11 }}>màj {lastRef.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>}
          <div className="badge-live"><div className="dot-live"/>LIVE · auto {AUTO_MS/60000}min</div>
          <button className="btn-top" onClick={recordPrices} disabled={refreshing}>
            {refreshing ? "..." : "↻ Actualiser"}
          </button>
        </div>
      </header>

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-inner">
          <AddPanel onAdd={addSkin} allSkins={allSkins} loadingDB={loadDB} dbError={dbErr} />

          {portfolio.length > 0 && <>
            <div className="divider"/>
            <div className="sec-head">Mes skins</div>
            {weapons.length > 2 && (
              <div className="f-pills mb12">
                {weapons.map(w => <button key={w} className={`f-pill${wFilter===w?" on":""}`} onClick={() => setWFilter(w)}>{w}</button>)}
              </div>
            )}
            <div>
              {active.map(s => {
                const curr = s.marketPrice ?? s.buy;
                const d = curr - s.buy;
                const dp = s.buy > 0 ? (d/s.buy)*100 : 0;
                const col = d >= 0 ? "#00ff87" : "#ff4d4d";
                return (
                  <div key={s.id} className={`skin-item${hidden[s.id]?" dim":""}`} onClick={() => toggleHide(s.id)}>
                    <div style={{ width:3,height:32,background:s.color,borderRadius:2,flexShrink:0 }}/>
                    {s.image ? <img src={s.image} style={{ width:44,height:30,objectFit:"contain",flexShrink:0 }} alt=""/> : <div style={{ width:44,height:30,background:"#111",borderRadius:4,flexShrink:0 }}/>}
                    <div className="skin-item-info">
                      <div className="skin-item-name">{s.name}</div>
                      <div className="skin-item-sub">{s.weapon} · {s.buy.toFixed(2)} €</div>
                    </div>
                    <div className="skin-item-price">
                      <div className="skin-price-val">{curr.toFixed(2)} €</div>
                      <div className="skin-price-delta" style={{ color:col }}>{d>=0?"+":""}{dp.toFixed(1)}%</div>
                    </div>
                    <button className="skin-del" onClick={e => { e.stopPropagation(); delSkin(s.id); }}>×</button>
                  </div>
                );
              })}
            </div>
          </>}
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        {portfolio.length === 0 ? (
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:12,textAlign:"center" }}>
            <div style={{ fontSize:56 }}>🎯</div>
            <div style={{ fontSize:20,fontWeight:600,color:"#fff" }}>Aucun skin</div>
            <p style={{ fontSize:13,color:"#444",maxWidth:340,lineHeight:1.7 }}>Ajoutez vos premiers skins via le panneau de gauche. Les courbes d'évolution se construiront automatiquement.</p>
          </div>
        ) : <>
          {/* KPI STRIP */}
          <div className="kpi-strip">
            <div className="kpi-cell">
              <div className="kpi-cell-label">Investi</div>
              <div className="kpi-cell-val">{fmt(totalBuy)} €</div>
              <div className="kpi-cell-sub">{active.length} skin{active.length!==1?"s":""}</div>
            </div>
            <div className="kpi-cell">
              <div className="kpi-cell-label">Valeur marché</div>
              <div className="kpi-cell-val">{fmt(totalMarket)} €</div>
              <div className="kpi-cell-sub">Steam lowest price</div>
            </div>
            <div className="kpi-cell">
              <div className="kpi-cell-label">Profit / Perte</div>
              <div className="kpi-cell-val" style={{ color:profit>=0?"#00ff87":"#ff4d4d" }}>{profit>=0?"+":""}{fmt(profit)} €</div>
              <div className="kpi-cell-sub">{pct>=0?"+":""}{fmt(pct,1)} % depuis l'achat</div>
            </div>
            <div className="kpi-cell">
              <div className="kpi-cell-label">Points de données</div>
              <div className="kpi-cell-val">{totalPts}</div>
              <div className="kpi-cell-sub">enregistrés par le proxy</div>
            </div>
          </div>

          {/* CHART CARD */}
          <div className="card mb12" style={{ marginBottom:12 }}>
            <div className="chart-top">
              <div>
                <div className="card-title" style={{ marginBottom:8, color:"#888" }}>Évolution du portefeuille</div>
                {hasHist && (
                  <div style={{ display:"flex",alignItems:"baseline",gap:10 }}>
                    <span className="price-big">{fmt(lastVal)} €</span>
                    <span className={`price-chip ${isUp?"chip-up":"chip-dn"}`}>
                      {isUp?"+":""}{fmt(chgAbs)} € ({isUp?"+":""}{fmt(chgPct,2)}%)
                    </span>
                  </div>
                )}
              </div>
              <div className="chart-controls">
                <div className="tab-row">
                  {["valeur","profit","skins","comparaison"].map(t => (
                    <button key={t} className={`t-btn${tab===t?" on":""}`} onClick={() => setTab(t)}>
                      {t.charAt(0).toUpperCase()+t.slice(1)}
                    </button>
                  ))}
                </div>
                {tab !== "comparaison" && (
                  <div className="range-row">
                    {RANGES.map(r => <button key={r.key} className={`r-btn${range===r.key?" on":""}`} onClick={() => setRange(r.key)}>{r.label}</button>)}
                  </div>
                )}
              </div>
            </div>

            {tab === "skins" && (
              <div className="leg-row">
                {active.map(s => (
                  <span key={s.id} className={`leg-it${hidden[s.id]?" dim":""}`} onClick={() => toggleHide(s.id)}>
                    <span className="leg-dot" style={{ background:hidden[s.id]?"#222":s.color }}/>
                    {s.name}
                  </span>
                ))}
              </div>
            )}

            <div className="chart-area">
              {tab === "comparaison" ? (
                compData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(200, compData.length*44+30)}>
                    <BarChart data={compData} layout="vertical" margin={{ top:4,right:16,bottom:0,left:0 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#141414" horizontal={false}/>
                      <XAxis type="number" tick={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fill:"#555" }} tickLine={false} axisLine={false} tickFormatter={v=>v.toFixed(0)+"€"}/>
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontFamily:"'Inter',sans-serif",fontSize:11,fill:"#555" }} tickLine={false} axisLine={false}/>
                      <Tooltip content={<Tip/>} cursor={{ fill:"rgba(255,255,255,0.03)" }}/>
                      <Bar dataKey="marche" name="Marché" fill="#00ff87" barSize={9} radius={[0,3,3,0]} fillOpacity={0.85}/>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="chart-empty"><p>Aucun skin visible.</p></div>
              ) : !hasHist ? (
                <div className="chart-empty">
                  <div className="e-icon">📈</div>
                  <p>Cliquez "↻ Actualiser" pour enregistrer le premier point de données. Les courbes se construiront au fil du temps.</p>
                </div>
              ) : tab === "valeur" ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={timeline} margin={{ top:4,right:16,bottom:0,left:0 }}>
                    <defs>
                      <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00ff87" stopOpacity={0.15}/>
                        <stop offset="100%" stopColor="#00ff87" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke="#141414"/>
                    <XAxis dataKey="label" tick={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fill:"#555" }} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                    <YAxis tick={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fill:"#555" }} tickLine={false} axisLine={false} tickFormatter={v=>v.toFixed(0)+"€"} width={50} orientation="right" domain={["dataMin - 3","dataMax + 3"]}/>
                    <Tooltip content={<Tip/>} cursor={{ stroke:"rgba(255,255,255,0.06)", strokeWidth:1, fill:"transparent" }}/>
                    <Area type="monotone" dataKey="valeur" name="Valeur" stroke="#00ff87" strokeWidth={1.5} fill="url(#gV)" dot={false} activeDot={{ r:3,fill:"#00ff87",strokeWidth:0 }}/>
                    <Line type="monotone" dataKey="ref" name="Prix initial" stroke="#ff4d4d" strokeWidth={1} strokeDasharray="5 4" dot={false} opacity={0.4}/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : tab === "profit" ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={timeline} margin={{ top:4,right:16,bottom:0,left:0 }}>
                    <defs>
                      <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00ff87" stopOpacity={0.12}/>
                        <stop offset="100%" stopColor="#00ff87" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke="#141414"/>
                    <XAxis dataKey="label" tick={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fill:"#555" }} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                    <YAxis tick={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fill:"#555" }} tickLine={false} axisLine={false} tickFormatter={v=>v.toFixed(0)+"€"} width={50} orientation="right"/>
                    <Tooltip content={<Tip/>} cursor={{ stroke:"rgba(255,255,255,0.06)", strokeWidth:1, fill:"transparent" }}/>
                    <ReferenceLine y={0} stroke="#222" strokeDasharray="3 3"/>
                    <Area type="monotone" dataKey="profit" name="Profit" stroke="#00ff87" strokeWidth={1.5} fill="url(#gP)" dot={false} activeDot={{ r:3,fill:"#00ff87",strokeWidth:0 }}/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={timeline} margin={{ top:4,right:16,bottom:0,left:0 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#141414"/>
                    <XAxis dataKey="label" tick={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fill:"#555" }} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                    <YAxis tick={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fill:"#555" }} tickLine={false} axisLine={false} tickFormatter={v=>v.toFixed(0)+"€"} width={50} orientation="right" domain={["dataMin - 2","dataMax + 2"]}/>
                    <Tooltip content={<Tip/>} cursor={{ stroke:"rgba(255,255,255,0.06)", strokeWidth:1, fill:"transparent" }}/>
                    {active.map(s => !hidden[s.id] && <Line key={s.id} type="monotone" dataKey={s.name} name={s.name} stroke={s.color} strokeWidth={1.5} dot={false} activeDot={{ r:3,strokeWidth:0 }} connectNulls/>)}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* BOTTOM */}
          <div className="bot-grid">
            <div className="card">
              <div className="card-pad">
                <div className="card-title">Profit par skin</div>
                {compData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(160, compData.length*42+20)}>
                    <BarChart data={compData} layout="vertical" margin={{ top:0,right:16,bottom:0,left:0 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#141414" horizontal={false}/>
                      <XAxis type="number" tick={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fill:"#555" }} tickLine={false} axisLine={false} tickFormatter={v=>(v>=0?"+":"")+v.toFixed(0)+"€"}/>
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontFamily:"'Inter',sans-serif",fontSize:11,fill:"#555" }} tickLine={false} axisLine={false}/>
                      <Tooltip content={<Tip/>} cursor={{ fill:"rgba(255,255,255,0.03)" }}/>
                      <ReferenceLine x={0} stroke="#1e1e1e"/>
                      <Bar dataKey="profit" name="Profit" barSize={11} radius={[0,3,3,0]}>
                        {compData.map((e,i) => <Cell key={i} fill={e.profit>=0?"#00ff87":"#ff4d4d"} fillOpacity={0.8}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="chart-empty" style={{ height:160 }}><p>Aucun skin</p></div>}
              </div>
            </div>

            <div className="card card-pad">
              <div className="card-title">Récapitulatif</div>
              <div className="stat-grid mb16">
                {[
                  { label:"Investi", val:`${fmt(totalBuy)} €`, color:"#fff" },
                  { label:"Valeur marché", val:`${fmt(totalMarket)} €`, color:"#00ff87" },
                  { label:"Profit total", val:`${profit>=0?"+":""}${fmt(profit)} €`, color:profit>=0?"#00ff87":"#ff4d4d" },
                  { label:"Performance", val:`${pct>=0?"+":""}${fmt(pct,1)} %`, color:pct>=0?"#00ff87":"#ff4d4d" },
                ].map(item => (
                  <div key={item.label} className="stat-cell">
                    <div className="stat-label">{item.label}</div>
                    <div className="stat-val" style={{ color:item.color }}>{item.val}</div>
                  </div>
                ))}
              </div>
              {active.length > 0 && <>
                <div className="card-title" style={{ marginBottom:10, color:"#888" }}>Top performances</div>
                {[...active].sort((a,b) => {
                  const pa = a.buy>0?((a.marketPrice??a.buy)-a.buy)/a.buy:0;
                  const pb = b.buy>0?((b.marketPrice??b.buy)-b.buy)/b.buy:0;
                  return pb - pa;
                }).slice(0,4).map((s,i) => {
                  const d = (s.marketPrice??s.buy) - s.buy;
                  const dp = s.buy>0?(d/s.buy)*100:0;
                  return (
                    <div key={s.id} className="perf-item">
                      <span className="perf-rank">#{i+1}</span>
                      {s.image && <img src={s.image} style={{ width:30,height:21,objectFit:"contain",borderRadius:3,marginRight:6 }} alt=""/>}
                      <span className="perf-name">{s.name}</span>
                      <div style={{ textAlign:"right",flexShrink:0 }}>
                        <div className="perf-val" style={{ color:dp>=0?"#00ff87":"#ff4d4d" }}>{dp>=0?"+":""}{dp.toFixed(1)}%</div>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"#444" }}>{d>=0?"+":""}{d.toFixed(2)} €</div>
                      </div>
                    </div>
                  );
                })}
              </>}
            </div>
          </div>
        </>}
      </main>
    </div>
  );
}