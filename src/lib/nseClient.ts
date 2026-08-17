import axios from "axios";

// NSE India proxy fetcher with proper headers to avoid blocking
// Uses the unofficial NSE endpoints — data may be delayed or temporarily unavailable

const NSE_BASE = "https://www.nseindia.com";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
};

const API_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/",
  "X-Requested-With": "XMLHttpRequest",
};

let cookieJar = "";
let cookieExpiry = 0;

async function refreshCookies(): Promise<void> {
  try {
    const resp = await axios.get(NSE_BASE, {
      headers: BROWSER_HEADERS,
      timeout: 10000,
      maxRedirects: 5,
    });
    const setCookie = resp.headers["set-cookie"];
    if (setCookie) {
      cookieJar = setCookie
        .map((c: string) => c.split(";")[0])
        .join("; ");
      cookieExpiry = Date.now() + 5 * 60 * 1000;
    }
  } catch {
    // Non-fatal; we'll try anyway with stale/empty cookies
  }
}

async function nseGet(path: string): Promise<unknown> {
  if (!cookieJar || Date.now() > cookieExpiry) {
    await refreshCookies();
  }
  const resp = await axios.get(`${NSE_BASE}${path}`, {
    headers: {
      ...API_HEADERS,
      Cookie: cookieJar,
    },
    timeout: 15000,
  });
  return resp.data;
}

export type IndexQuote = {
  name: string;
  last: number;
  previousClose: number;
  change: number;
  pChange: number;
  open: number;
  high: number;
  low: number;
  yearHigh: number;
  yearLow: number;
};

function parseIndexData(rawData: unknown): IndexQuote | null {
  try {
    if (typeof rawData !== "object" || rawData === null) return null;
    const obj = rawData as Record<string, unknown>;
    const d = obj["data"] as Record<string, unknown> | undefined;
    if (!d) return null;
    return {
      name: String(d["indexSymbol"] ?? d["index"] ?? ""),
      last: Number(d["last"] ?? d["indexCloseOnlineRecords"] ?? 0),
      previousClose: Number(d["previousClose"] ?? 0),
      change: Number(d["variation"] ?? d["change"] ?? 0),
      pChange: Number(d["percentChange"] ?? d["pChange"] ?? 0),
      open: Number(d["open"] ?? 0),
      high: Number(d["high"] ?? 0),
      low: Number(d["low"] ?? 0),
      yearHigh: Number(d["yearHigh"] ?? 0),
      yearLow: Number(d["yearLow"] ?? 0),
    };
  } catch {
    return null;
  }
}

// Fetch all indices in one call
export async function fetchAllIndices(): Promise<IndexQuote[]> {
  try {
    const data = await nseGet("/api/allIndices");
    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      const arr = obj["data"];
      if (Array.isArray(arr)) {
        return arr.map((item: unknown): IndexQuote => {
          const it = item as Record<string, unknown>;
          return {
            name: String(it["index"] ?? it["indexSymbol"] ?? ""),
            last: Number(it["last"] ?? 0),
            previousClose: Number(it["previousClose"] ?? 0),
            change: Number(it["variation"] ?? it["change"] ?? 0),
            pChange: Number(it["percentChange"] ?? it["pChange"] ?? 0),
            open: Number(it["open"] ?? 0),
            high: Number(it["high"] ?? 0),
            low: Number(it["low"] ?? 0),
            yearHigh: Number(it["yearHigh"] ?? 0),
            yearLow: Number(it["yearLow"] ?? 0),
          };
        });
      }
    }
    return [];
  } catch {
    return [];
  }
}

// Fetch single index quote
export async function fetchIndexQuote(symbol: string): Promise<IndexQuote | null> {
  try {
    const encoded = encodeURIComponent(symbol);
    const data = await nseGet(`/api/index?symbol=${encoded}`);
    return parseIndexData(data);
  } catch {
    return null;
  }
}

export type EquityQuote = {
  symbol: string;
  last: number;
  previousClose: number;
  change: number;
  pChange: number;
  open: number;
  high: number;
  low: number;
};

// Fetch a listed ETF/equity quote from NSE. Used for underlying ETF mappings
// such as UTI Gold ETF -> GOLDBETA.
export async function fetchEquityQuote(symbol: string): Promise<EquityQuote | null> {
  try {
    const encoded = encodeURIComponent(symbol);
    const raw = await nseGet(`/api/quote-equity?symbol=${encoded}`);
    if (typeof raw !== "object" || raw === null) return null;
    const obj = raw as Record<string, any>;
    const d = obj["priceInfo"] ?? obj["data"]?.["priceInfo"] ?? obj["data"];
    if (!d) return null;
    const last = Number(d["lastPrice"] ?? d["last"] ?? 0);
    const previousClose = Number(d["previousClose"] ?? 0);
    const change = Number(d["change"] ?? (last - previousClose));
    const pChange = Number(d["pChange"] ?? (previousClose ? (change / previousClose) * 100 : 0));
    if (!Number.isFinite(last) || last <= 0 || !Number.isFinite(pChange)) return null;
    return {
      symbol,
      last,
      previousClose,
      change,
      pChange,
      open: Number(d["open"] ?? 0),
      high: Number(d["intraDayHighLow"]?.["max"] ?? d["high"] ?? 0),
      low: Number(d["intraDayHighLow"]?.["min"] ?? d["low"] ?? 0),
    };
  } catch {
    return null;
  }
}

export { nseGet };
