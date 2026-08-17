export type FundConfig = {
  id: number;
  name: string;
  amfiCode: string;
  proxyIndex: string;
  category: string;
  primarySector: string;
  primaryProxy: string;
  secondaryProxies: string[];
  underlyingAmfiCode?: string;
  underlyingSchemeName?: string;
};

// Approved fund universe — ONLY these funds are used by the terminal.
export const DEFAULT_FUNDS: FundConfig[] = [
  { id: 1, name: "Quant Flexi Cap Fund Direct Growth", amfiCode: "120843", proxyIndex: "NIFTY 500", category: "Flexi Cap", primarySector: "Broad Market", primaryProxy: "NIFTY 500", secondaryProxies: ["NIFTY 50"] },
  { id: 2, name: "Quant Large and Mid Cap Fund Direct Growth", amfiCode: "120826", proxyIndex: "NIFTY LARGEMIDCAP 250", category: "Large & Mid Cap", primarySector: "Large + Mid Cap", primaryProxy: "NIFTY LARGEMIDCAP 250", secondaryProxies: ["NIFTY 50", "NIFTY MIDCAP 150"] },
  { id: 3, name: "Quant Multi Asset Fund Direct Growth", amfiCode: "120821", proxyIndex: "NIFTY 500", category: "Multi Asset", primarySector: "Diversified Equity", primaryProxy: "NIFTY 500", secondaryProxies: ["NIFTY 50"] },
  { id: 4, name: "Quant Multi Cap Fund Direct Growth", amfiCode: "120823", proxyIndex: "NIFTY 500", category: "Multi Cap", primarySector: "Broad Equity", primaryProxy: "NIFTY 500", secondaryProxies: ["NIFTY 50"] },
  { id: 5, name: "Quant Infrastructure Fund Direct Growth", amfiCode: "120833", proxyIndex: "NIFTY INFRASTRUCTURE", category: "Sectoral - Infra", primarySector: "Infrastructure", primaryProxy: "NIFTY INFRASTRUCTURE", secondaryProxies: ["NIFTY 500"] },
  { id: 6, name: "Quant BFSI Fund Direct Growth", amfiCode: "151791", proxyIndex: "NIFTY FINANCIAL SERVICES", category: "Sectoral - BFSI", primarySector: "BFSI", primaryProxy: "NIFTY FINANCIAL SERVICES", secondaryProxies: ["NIFTY BANK", "NIFTY PSU BANK"] },
  { id: 7, name: "SBI Nifty 50 Index Fund Direct Growth", amfiCode: "119827", proxyIndex: "NIFTY 50", category: "Index - Large Cap", primarySector: "Large Cap", primaryProxy: "NIFTY 50", secondaryProxies: [] },
  { id: 8, name: "SBI Healthcare Opportunities Fund Direct Growth", amfiCode: "119783", proxyIndex: "NIFTY PHARMA", category: "Sectoral - Healthcare", primarySector: "Pharma / Healthcare", primaryProxy: "NIFTY PHARMA", secondaryProxies: ["NIFTY HEALTHCARE"] },
  { id: 9, name: "SBI Focused Equity Fund Direct Growth", amfiCode: "119727", proxyIndex: "NIFTY 500", category: "Focused Equity", primarySector: "Broad Equity", primaryProxy: "NIFTY 500", secondaryProxies: ["NIFTY 50"] },
  { id: 10, name: "SBI Children's Benefit Fund Direct Growth", amfiCode: "148490", proxyIndex: "NIFTY 500", category: "Solution Oriented", primarySector: "Broad Equity", primaryProxy: "NIFTY 500", secondaryProxies: ["NIFTY 50"] },
  { id: 11, name: "Bandhan Small Cap Fund Direct Growth", amfiCode: "147946", proxyIndex: "NIFTY SMALLCAP 250", category: "Small Cap", primarySector: "Small Cap", primaryProxy: "NIFTY SMALLCAP 250", secondaryProxies: ["NIFTY 500"] },
  { id: 12, name: "HDFC Mid Cap Opportunities Fund Direct Growth", amfiCode: "118989", proxyIndex: "NIFTY MIDCAP 150", category: "Mid Cap", primarySector: "Mid Cap", primaryProxy: "NIFTY MIDCAP 150", secondaryProxies: ["NIFTY 500"] },
  { id: 13, name: "UTI Nifty Next 50 Index Fund Direct Growth", amfiCode: "143341", proxyIndex: "NIFTY NEXT 50", category: "Index - Large Cap", primarySector: "Next 50", primaryProxy: "NIFTY NEXT 50", secondaryProxies: ["NIFTY 50"] },
  { id: 14, name: "UTI Gold ETF FoF Direct Growth", amfiCode: "150714", proxyIndex: "GOLD", category: "Commodity - Gold", primarySector: "Gold", primaryProxy: "GOLD", secondaryProxies: [], underlyingAmfiCode: "590101", underlyingSchemeName: "UTI Mutual Fund - UTI Gold Exchange Traded Fund" },
  { id: 15, name: "SBI Small Cap Fund Direct Growth", amfiCode: "125497", proxyIndex: "NIFTY SMALLCAP 250", category: "Small Cap", primarySector: "Small Cap", primaryProxy: "NIFTY SMALLCAP 250", secondaryProxies: ["NIFTY 500"] },
  { id: 16, name: "ICICI Prudential Value Discovery Fund Direct Growth", amfiCode: "120586", proxyIndex: "NIFTY 500", category: "Value", primarySector: "Broad Equity / Value", primaryProxy: "NIFTY 500", secondaryProxies: ["NIFTY 50"] },
  { id: 17, name: "Axis ELSS Tax Saver Fund Direct Growth", amfiCode: "120503", proxyIndex: "NIFTY 50", category: "ELSS", primarySector: "Large Cap / Broad Equity", primaryProxy: "NIFTY 50", secondaryProxies: ["NIFTY 500"] },
  { id: 18, name: "Sundaram Services Fund Direct Growth", amfiCode: "144835", proxyIndex: "NIFTY SERVICES SECTOR", category: "Thematic", primarySector: "Services", primaryProxy: "NIFTY SERVICES SECTOR", secondaryProxies: ["NIFTY 500"] },
  { id: 19, name: "Tata Digital India Fund Direct Growth", amfiCode: "135800", proxyIndex: "NIFTY IT", category: "Sectoral - IT", primarySector: "IT / Technology", primaryProxy: "NIFTY IT", secondaryProxies: ["NIFTY 500"] },
];

export const INDEX_LIST = [
  "NIFTY 50", "NIFTY NEXT 50", "NIFTY MIDCAP 150", "NIFTY SMALLCAP 250", "NIFTY BANK", "NIFTY IT", "NIFTY AUTO", "NIFTY PHARMA", "NIFTY HEALTHCARE", "NIFTY FMCG", "NIFTY METAL", "NIFTY REALTY", "NIFTY FINANCIAL SERVICES", "NIFTY ENERGY", "NIFTY PSU BANK", "NIFTY INFRASTRUCTURE", "NIFTY LARGEMIDCAP 250", "NIFTY 500", "NIFTY MEDIA", "NIFTY SERVICES SECTOR", "GOLD"
];

export const NSE_INDEX_MAP: Record<string, string> = {
  "NIFTY 50": "NIFTY 50", "NIFTY NEXT 50": "NIFTY NEXT 50", "NIFTY MIDCAP 150": "NIFTY MIDCAP 150", "NIFTY SMALLCAP 250": "NIFTY SMALLCAP 250", "NIFTY BANK": "NIFTY BANK", "NIFTY IT": "NIFTY IT", "NIFTY AUTO": "NIFTY AUTO", "NIFTY PHARMA": "NIFTY PHARMA", "NIFTY HEALTHCARE": "NIFTY HEALTHCARE", "NIFTY FMCG": "NIFTY FMCG", "NIFTY METAL": "NIFTY METAL", "NIFTY REALTY": "NIFTY REALTY", "NIFTY FINANCIAL SERVICES": "NIFTY FINANCIAL SERVICES", "NIFTY ENERGY": "NIFTY ENERGY", "NIFTY PSU BANK": "NIFTY PSU BANK", "NIFTY INFRASTRUCTURE": "NIFTY INFRASTRUCTURE", "NIFTY LARGEMIDCAP 250": "NIFTY LARGEMIDCAP 250", "NIFTY 500": "NIFTY 500", "NIFTY MEDIA": "NIFTY MEDIA", "NIFTY SERVICES SECTOR": "NIFTY SERVICES SECTOR", "GOLD": "GOLD" };
