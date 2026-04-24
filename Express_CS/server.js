/**
 * server.js — CS2 Wallet Backend
 *
 * Express server handling:
 *   - Steam OpenID authentication (via passport-steam)
 *   - Session management
 *   - In-memory portfolio storage
 *   - Steam Market API proxying (price history, lowest listing)
 *   - Secret management via HashiCorp Vault (production) or .env (local)
 *
 * Port: process.env.PORT || 3001
 */

require("dotenv/config");

const { requireAuth }                   = require("./middleware/auth");
const { portfolios, history }           = require("./store");

const express  = require("express");
const cors     = require("cors");
const session  = require("express-session");
const passport = require("passport");
const Steam    = require("passport-steam").Strategy;
const vault    = require("node-vault");
const https    = require("https");

const app  = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// CORS
// Allow requests from the Vite dev server and handle preflight OPTIONS.
// ---------------------------------------------------------------------------
app.use(cors({
  origin:      "http://localhost:5173",
  credentials: true
}));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin",      "http://localhost:5173");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers",     "Content-Type");
  res.header("Access-Control-Allow-Methods",     "GET,POST,OPTIONS");
  next();
});

// ---------------------------------------------------------------------------
// Route imports
// Imported at module level to ensure they are available when registered.
// ---------------------------------------------------------------------------
const portfolioRoute = require("./routes/portfolio");

// ---------------------------------------------------------------------------
// Secret management
// ---------------------------------------------------------------------------

/** Steam Web API key — required for OpenID authentication */
let STEAM_API_KEY  = "";

/** Express session secret — used to sign session cookies */
let SESSION_SECRET = "fallback_secret_change_me";

/**
 * Loads application secrets from the appropriate source:
 *   - Production: HashiCorp Vault (HCP)
 *   - Local:      .env file via dotenv
 *
 * Exits the process if Vault is unreachable in production.
 *
 * @returns {Promise<void>}
 */
async function loadSecrets() {
  if (process.env.NODE_ENV === "production") {
    try {
      const vc = vault({
        apiVersion: "v1",
        endpoint:   process.env.VAULT_ADDR,
        token:      process.env.VAULT_TOKEN,
        namespace:  process.env.VAULT_NAMESPACE || "admin",
      });

      const result  = await vc.read("secret/data/csgo-wallet");
      const secrets = result.data.data;

      STEAM_API_KEY  = secrets.STEAM_API_KEY;
      SESSION_SECRET = secrets.SESSION_SECRET;

      console.log("[Secrets] Loaded from Vault HCP");
    } catch (err) {
      console.error("[Secrets] Failed to load from Vault:", err.message);
      process.exit(1);
    }
  } else {
    STEAM_API_KEY  = process.env.STEAM_API_KEY;
    SESSION_SECRET = process.env.SESSION_SECRET || "fallback_secret_change_me";
    console.log("[Secrets] Loaded from .env (local mode)");
  }
}

// ---------------------------------------------------------------------------
// Steam API helpers
// ---------------------------------------------------------------------------

/**
 * Performs an HTTPS GET request to steamcommunity.com and returns parsed JSON.
 *
 * Rejects with descriptive errors on:
 *   - HTTP 429 (rate limit)
 *   - HTTP 400 (bad request — likely expired cookie)
 *   - JSON parse failure
 *
 * @param {string} reqPath      - URL path (e.g. "/market/priceoverview/...")
 * @param {Object} extraHeaders - Additional HTTP headers (e.g. Cookie)
 * @returns {Promise<Object>} Parsed JSON response
 */
function steamRequest(reqPath, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "steamcommunity.com",
      path:     reqPath,
      method:   "GET",
      headers:  {
        "User-Agent":      "Mozilla/5.0",
        "Accept-Language": "fr-FR,fr;q=0.9",
        ...extraHeaders,
      },
    }, (res) => {
      if (res.statusCode === 429)
        return reject(new Error("Steam rate limit reached"));
      if (res.statusCode === 400)
        return reject(new Error("Bad request — Steam cookie may be expired"));

      let body = "";
      res.on("data", chunk => { body += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error("Failed to parse Steam response as JSON")); }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

/**
 * Parses a localized Steam price string into a plain float.
 * Handles EU format (e.g. "1.234,56€" → 1234.56).
 *
 * @param {string} raw - Raw price string from Steam API
 * @returns {number|null} Parsed price, or null if parsing fails
 */
function parseSteamPrice(raw) {
  if (!raw) return null;
  const c = raw.replace(/\s/g, "").replace(/[^\d.,]/g, "");
  const n = c.includes(",") && c.includes(".")
    ? c.replace(".", "").replace(",", ".")
    : c.replace(",", ".");
  return parseFloat(n) || null;
}

/**
 * Parses a Steam date string into a Unix timestamp (ms).
 * Steam format: "Mar 19 2026 01: +0" → normalized to "Mar 19 2026 01:00 +0000"
 *
 * @param {string} str - Raw Steam date string
 * @returns {number|null} Unix timestamp in ms, or null if parsing fails
 */
function parseSteamDate(str) {
  try {
    const clean = str.replace(/(\d+): \+0/, "$1:00 +0000");
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d.getTime();
  } catch {
    return null;
  }
}

/**
 * Downsamples a price history array to a maximum number of points.
 * Used to reduce payload size before sending data to the frontend.
 *
 * @param {{ t: number, p: number }[]} points - Price history array
 * @param {number} max - Maximum number of points to keep (default: 2000)
 * @returns {{ t: number, p: number }[]} Downsampled array
 */
function downsampleBackend(points, max = 2000) {
  if (points.length <= max) return points;
  const step = Math.floor(points.length / max);
  return points.filter((_, i) => i % step === 0);
}

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------

/**
 * Initializes and starts the Express server.
 *
 * Order of operations:
 *   1. Load secrets (Vault or .env)
 *   2. Patch OpenID association (disable association mode for Steam)
 *   3. Register middleware (JSON, session, Passport)
 *   4. Configure Passport Steam strategy
 *   5. Register routes
 *   6. Start listening
 *
 * @returns {Promise<void>}
 */
async function startServer() {
  await loadSecrets();

  console.log("[Server] STEAM_API_KEY:", STEAM_API_KEY ? "defined" : "MISSING");
  console.log("[Server] STEAM_COOKIE:", process.env.STEAM_COOKIE ? "defined" : "MISSING");

  // Disable OpenID association mode — required for Steam OpenID to work
  const openid = require("openid");
  openid.RelyingParty.prototype._getAssociation = function(endpoint, callback) {
    callback(null, null);
  };

  const BASE_URL     = process.env.BASE_URL     || `http://localhost:${PORT}`;
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

  // --- Middleware ---
  app.use(express.json());
  app.use(session({
    secret:            SESSION_SECRET,
    resave:            false,
    saveUninitialized: false,
    cookie: {
      secure:   process.env.NODE_ENV === "production", // HTTPS only in production
      httpOnly: true,
      maxAge:   7 * 24 * 60 * 60 * 1000 // 7 days
    },
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  // --- Passport Steam strategy ---
  passport.use(new Steam(
    {
      returnURL: `${BASE_URL}/auth/steam/return`,
      realm:     `${BASE_URL}/`,
      apiKey:    STEAM_API_KEY,
      profile:   true,
    },
    (identifier, profile, done) => done(null, {
      steamId:     profile.id,
      displayName: profile.displayName,
      avatar:      profile.photos?.[2]?.value || profile.photos?.[0]?.value || null,
      profileUrl:  profile._json?.profileurl  || null,
    })
  ));

  // Store the full user object in the session
  passport.serializeUser((user, done)   => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  // ---------------------------------------------------------------------------
  // Auth routes
  // ---------------------------------------------------------------------------

  /** Redirects the user to the Steam OpenID login page */
  app.get("/auth/steam",
    passport.authenticate("steam", { failureRedirect: "/" })
  );

  /** Steam OpenID callback — redirects to frontend on success */
  app.get("/auth/steam/return",
    passport.authenticate("steam", { failureRedirect: `${FRONTEND_URL}/?error=auth` }),
    (req, res) => res.redirect(FRONTEND_URL)
  );

  /**
   * Returns the current session user.
   * Used by the frontend to check authentication state on load.
   */
  app.get("/api/me", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ authenticated: true, user: req.user });
    } else {
      res.json({ authenticated: false, user: null });
    }
  });

  /** Destroys the session and redirects to the frontend */
  app.get("/auth/logout", (req, res) => {
    req.logout(() => res.redirect(FRONTEND_URL));
  });

  // ---------------------------------------------------------------------------
  // Steam inventory
  // ---------------------------------------------------------------------------

  /**
   * GET /api/inventory
   * Returns the authenticated user's CS2 inventory from Steam.
   * Limited to 200 items.
   */
  app.get("/api/inventory", requireAuth, async (req, res) => {
    try {
      const data = await steamRequest(
        `/inventory/${req.user.steamId}/730/2?l=english&count=200`
      );
      res.json(data);
    } catch (err) {
      console.error("[GET /api/inventory] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // In-memory portfolio storage
  // ---------------------------------------------------------------------------

  /**
   * GET /api/portfolio
   * Returns the authenticated user's saved portfolio from memory.
   * Returns an empty array if no portfolio has been saved yet.
   */
  app.get("/api/portfolio", requireAuth, (req, res) => {
    res.json(portfolios[req.user.steamId] || []);
  });

  /**
   * POST /api/portfolio
   * Saves the authenticated user's portfolio to memory.
   * Body: { portfolio: Skin[] }
   */
  app.post("/api/portfolio", requireAuth, (req, res) => {
    const { portfolio } = req.body;

    if (!Array.isArray(portfolio)) {
      return res.status(400).json({ error: "Request body must contain a 'portfolio' array" });
    }

    portfolios[req.user.steamId] = portfolio;
    res.json({ saved: true });
  });

  // ---------------------------------------------------------------------------
  // Steam market price endpoints
  // ---------------------------------------------------------------------------

  /**
   * GET /steam-price?name=<marketHashName>
   * Returns the current lowest listing and median price for a skin.
   * Currency: EUR (currency=3)
   */
  app.get("/steam-price", async (req, res) => {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: "Missing required query parameter: name" });
    }

    try {
      const data = await steamRequest(
        `/market/priceoverview/?appid=730&currency=3&market_hash_name=${encodeURIComponent(name)}`
      );
      res.json(data);
    } catch (e) {
      console.error("[GET /steam-price] Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /steam-full-history?name=<marketHashName>
   * Returns the full price history for a skin from Steam Market.
   * Requires a valid STEAM_COOKIE environment variable.
   *
   * Response: { name: string, points: { t: number, p: number }[] }
   */
  app.get("/steam-full-history", requireAuth, async (req, res) => {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: "Missing required query parameter: name" });
    }

    const cookie = process.env.STEAM_COOKIE;
    if (!cookie) {
      return res.status(500).json({ error: "STEAM_COOKIE environment variable is not set" });
    }

    try {
      const data = await steamRequest(
        `/market/pricehistory/?appid=730&market_hash_name=${encodeURIComponent(name)}`,
        { Cookie: `steamLoginSecure=${cookie}` }
      );

      if (!data.success) {
        return res.status(500).json({ error: "History not found — Steam cookie may be expired" });
      }

      // Normalize Steam price history into { t, p } format
      const points = (data.prices || [])
        .map(([dateStr, priceStr]) => ({
          t: parseSteamDate(dateStr),
          p: parseFloat(priceStr),
        }))
        .filter(pt => pt.t && !isNaN(pt.p));

      res.json({ name, points });
    } catch (e) {
      console.error("[GET /steam-full-history] Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ---------------------------------------------------------------------------
  // Price recording (batch)
  // ---------------------------------------------------------------------------

  /**
   * POST /record-prices
   * Fetches and stores the current price for up to 5 skins per call.
   * Adds a 1-second delay between requests to respect Steam rate limits.
   *
   * Body: { skins: string[] } — array of market hash names
   * Response: { recorded: { [name]: { success, price? } }, timestamp }
   */
  app.post("/record-prices", async (req, res) => {
    const { skins } = req.body;

    if (!skins || !Array.isArray(skins)) {
      return res.status(400).json({ error: "Request body must contain a 'skins' array" });
    }

    const results     = {};
    const now         = Date.now();
    const MAX_PER_CYCLE = 5;
    const slice       = skins.slice(0, MAX_PER_CYCLE);

    for (let i = 0; i < slice.length; i++) {
      const name = slice[i];

      try {
        // Rate limit delay between requests
        if (i > 0) await new Promise(r => setTimeout(r, 1000));

        const data = await steamRequest(
          `/market/priceoverview/?appid=730&currency=3&market_hash_name=${encodeURIComponent(name)}`
        );

        if (data.success) {
          const price = parseSteamPrice(data.lowest_price || data.median_price);
          if (price) {
            if (!history[name]) history[name] = [];
            history[name].push({ t: now, p: price });
            results[name] = { success: true, price };
          }
        } else {
          results[name] = { success: false, error: "Skin not found on Steam Market" };
        }
      } catch (e) {
        console.error(`[POST /record-prices] Error for ${name}:`, e.message);
        results[name] = { success: false, error: e.message };
      }
    }

    res.json({ recorded: results, timestamp: now });
  });

  // ---------------------------------------------------------------------------
  // Portfolio route (delegated)
  // ---------------------------------------------------------------------------

  /**
   * GET /portfolio?range=<range>
   * Delegated to routes/portfolio.js
   * Returns full portfolio data including timeline and skin metrics.
   */
  app.use("/portfolio", portfolioRoute);

  // ---------------------------------------------------------------------------
  // Start listening
  // ---------------------------------------------------------------------------
  app.listen(PORT, () => {
    console.log("==========================================");
    console.log("  CS2 Wallet Backend");
    console.log(`  Listening on http://localhost:${PORT}`);
    console.log("==========================================");
    console.log(`  Auth Steam  : http://localhost:${PORT}/auth/steam`);
    console.log(`  API me      : http://localhost:${PORT}/api/me`);
    console.log(`  Portfolio   : http://localhost:${PORT}/api/portfolio`);
    console.log(`  Inventory   : http://localhost:${PORT}/api/inventory`);
  });
}

startServer();