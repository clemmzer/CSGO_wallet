const BASE = "http://localhost:3001";

export async function fetchPortfolio(range = "30d") {
  const r = await fetch(`${BASE}/portfolio?range=${range}`, {
    credentials: "include"
  });
  if (!r.ok) throw new Error(`fetchPortfolio ${r.status}`);
  return r.json();
}

export async function savePortfolio(skins) {
  const r = await fetch(`${BASE}/api/portfolio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ portfolio: skins })
  });
  if (!r.ok) throw new Error(`savePortfolio ${r.status}`);
  return r.json();
}