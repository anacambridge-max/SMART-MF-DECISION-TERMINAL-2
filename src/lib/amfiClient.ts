import axios from "axios";

// AMFI India NAV client
// Official daily NAV file — updated once per day after market close (~9–11 PM IST)
// This is the only FREE authoritative source for mutual fund NAVs in India

const AMFI_NAV_URL =
  "https://www.amfiindia.com/spages/NAVAll.txt";

const MFAPI_BASE = "https://api.mfapi.in";

export type NavRecord = {
  schemeCode: string;
  schemeName: string;
  nav: number;
  date: string; // DD-MMM-YYYY
};

// Parse the AMFI flat-text NAV file
// Format: SchemeCode;ISINDivPay;ISINDivReinvest;SchemeName;NetAssetValue;Date
export async function fetchAmfiNavAll(): Promise<NavRecord[]> {
  try {
    const resp = await axios.get(AMFI_NAV_URL, {
      timeout: 30000,
      responseType: "text",
    });
    const lines: string[] = resp.data.split("\n");
    const records: NavRecord[] = [];
    for (const line of lines) {
      const parts = line.trim().split(";");
      if (parts.length < 6) continue;
      const schemeCode = parts[0].trim();
      const schemeName = parts[3].trim();
      const navStr = parts[4].trim();
      const dateStr = parts[5].trim();
      if (!schemeCode || isNaN(Number(navStr)) || !dateStr) continue;
      records.push({
        schemeCode,
        schemeName,
        nav: parseFloat(navStr),
        date: dateStr,
      });
    }
    return records;
  } catch {
    return [];
  }
}

// Fetch NAV for a specific scheme from AMFI bulk file
export async function fetchNavForScheme(
  schemeCode: string
): Promise<NavRecord | null> {
  try {
    const allNavs = await fetchAmfiNavAll();
    return allNavs.find((r) => r.schemeCode === schemeCode) ?? null;
  } catch {
    return null;
  }
}

// Fetch historical NAVs from mfapi.in (mirrors AMFI data, JSON format)
export type HistoricalNav = {
  date: string; // DD-MM-YYYY
  nav: string;
};

export async function fetchHistoricalNav(
  schemeCode: string
): Promise<HistoricalNav[]> {
  try {
    const resp = await axios.get(`${MFAPI_BASE}/mf/${schemeCode}`, {
      timeout: 15000,
    });
    const data = resp.data as { data?: HistoricalNav[] };
    return data?.data ?? [];
  } catch {
    return [];
  }
}

// Compute SMAs and returns from historical NAV array (sorted newest first)
export type FundTechnicals = {
  sma20: number | null;
  sma50: number | null;
  sma100: number | null;
  sma200: number | null;
  return1M: number | null;
  return3M: number | null;
  return6M: number | null;
  return1Y: number | null;
  drawdown52W: number | null;
  allTimeDrawdown: number | null;
  momentum10D: number | null;
  momentum20D: number | null;
  momentum50D: number | null;
  latestNav: number | null;
  navDate: string | null;
  trendStatus: "uptrend" | "downtrend" | "sideways";
};

function parseNavDate(dateStr: string): Date {
  // Format: DD-MM-YYYY or DD-MMM-YYYY
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    if (parts[1].length > 2) {
      // DD-MMM-YYYY
      return new Date(`${parts[1]} ${parts[0]} ${parts[2]}`);
    } else {
      // DD-MM-YYYY
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
  }
  return new Date(dateStr);
}

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(0, period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function computeTechnicals(
  historicalNavs: HistoricalNav[]
): FundTechnicals {
  // navs sorted newest first
  const navValues = historicalNavs
    .map((h) => parseFloat(h.nav))
    .filter((v) => !isNaN(v));

  if (navValues.length === 0) {
    return {
      sma20: null,
      sma50: null,
      sma100: null,
      sma200: null,
      return1M: null,
      return3M: null,
      return6M: null,
      return1Y: null,
      drawdown52W: null,
      allTimeDrawdown: null,
      momentum10D: null,
      momentum20D: null,
      momentum50D: null,
      latestNav: null,
      navDate: null,
      trendStatus: "sideways",
    };
  }

  const latest = navValues[0];
  const navDate = historicalNavs[0]?.date ?? null;

  const sma20v = sma(navValues, 20);
  const sma50v = sma(navValues, 50);
  const sma100v = sma(navValues, 100);
  const sma200v = sma(navValues, 200);

  const ret = (past: number | undefined) =>
    past && past !== 0 ? ((latest - past) / past) * 100 : null;

  const return1M = ret(navValues[21]);
  const return3M = ret(navValues[63]);
  const return6M = ret(navValues[126]);
  const return1Y = ret(navValues[252]);

  // 52W high/low from past ~252 trading days
  const window52W = navValues.slice(0, 252);
  const high52W = Math.max(...window52W);
  const low52W = Math.min(...window52W);
  const drawdown52W = high52W > 0 ? ((latest - high52W) / high52W) * 100 : null;

  // All-time drawdown
  const allTimeHigh = Math.max(...navValues);
  const allTimeDrawdown =
    allTimeHigh > 0 ? ((latest - allTimeHigh) / allTimeHigh) * 100 : null;

  const momentum10D = ret(navValues[10]);
  const momentum20D = ret(navValues[20]);
  const momentum50D = ret(navValues[50]);

  // Trend: compare vs SMAs
  let trendStatus: "uptrend" | "downtrend" | "sideways" = "sideways";
  if (sma50v !== null && sma200v !== null) {
    if (latest > sma50v && sma50v > sma200v) trendStatus = "uptrend";
    else if (latest < sma50v && sma50v < sma200v) trendStatus = "downtrend";
  } else if (sma50v !== null) {
    trendStatus = latest > sma50v ? "uptrend" : "downtrend";
  }

  void low52W; // used implicitly via drawdown calculation

  return {
    sma20: sma20v,
    sma50: sma50v,
    sma100: sma100v,
    sma200: sma200v,
    return1M,
    return3M,
    return6M,
    return1Y,
    drawdown52W,
    allTimeDrawdown,
    momentum10D,
    momentum20D,
    momentum50D,
    latestNav: latest,
    navDate,
    trendStatus,
  };
}
