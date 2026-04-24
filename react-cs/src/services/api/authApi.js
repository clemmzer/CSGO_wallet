const BASE = "http://localhost:3001";

export async function fetchMe() {
  const r = await fetch(`${BASE}/api/me`, {
    credentials: "include"
  });
  if (!r.ok) throw new Error(`fetchMe ${r.status}`);
  return r.json();
}

export function loginWithSteam() {
  window.location.href = `${BASE}/auth/steam`;
}

export function logoutSteam() {
  window.location.href = `${BASE}/auth/logout`;
}