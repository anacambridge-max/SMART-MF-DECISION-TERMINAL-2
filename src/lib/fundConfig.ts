export type FundConfig = {
  id: number;
  name: string;
  amfiCode: string;
  proxyIndex: string;
  category: string;
};

export const DEFAULT_FUNDS: FundConfig[] = [
  { id: 1, name: "SBI Nifty 50 Index Fund", amfiCode: "120585", proxyIndex: "NIFTY 50", category: "Large Cap" },
  { id: 2, name: "UTI Nifty Next 50 Index Fund", amfiCode: "120841", proxyIndex: "NIFTY NEXT 50", category: "Large Cap" },
  { id: 3, name: "UTI Gold ETF FoF", amfiCode: "145538", proxyIndex: "GOLD", category: "Commodity" },
  { id: 4, name: "SBI Small Cap Fund", amfiCode: "125494", proxyIndex: "NIFTY SMALLCAP 250", category: "Small Cap" },
  { id: 5, name: "HDFC Mid Cap Opportunities Fund", amfiCode: "118989", proxyIndex: "NIFTY MIDCAP 150", category: "Mid Cap" },
  { id: 6, name: "Quant Large & Mid Cap Fund", amfiCode: "120842", proxyIndex: "NIFTY LARGEMIDCAP 250", category: "Large & Mid Cap" },
  { id: 7, name: "Tata Digital India Fund", amfiCode: "135800", proxyIndex: "NIFTY IT", category: "Sectoral - IT" },
  { id: 8, name: "SBI Healthcare Opportunities Fund", amfiCode: "100341", proxyIndex: "NIFTY PHARMA", category: "Sectoral - Pharma" },
  { id: 9, name: "Quant BFSI Fund", amfiCode: "149001", proxyIndex: "NIFTY FINANCIAL SERVICES", category: "Sectoral - BFSI" },
  { id: 10, name: "Quant Infrastructure Fund", amfiCode: "120843", proxyIndex: "NIFTY INFRA", category: "Sectoral - Infra" },
  { id: 11, name: "Sundaram Services Fund", amfiCode: "147632", proxyIndex: "NIFTY 500", category: "Thematic" },
  { id: 12, name: "HDFC Flexi Cap Fund", amfiCode: "100270", proxyIndex: "NIFTY 500", category: "Flexi Cap" },
  { id: 13, name: "Parag Parikh Flexi Cap Fund", amfiCode: "122639", proxyIndex: "NIFTY 500", category: "Flexi Cap" },
  { id: 14, name: "Mirae Asset Emerging Bluechip Fund", amfiCode: "118825", proxyIndex: "NIFTY LARGEMIDCAP 250", category: "Large & Mid Cap" },
  { id: 15, name: "Axis ELSS Tax Saver Fund", amfiCode: "120505", proxyIndex: "NIFTY 50", category: "ELSS" },
  { id: 16, name: "SBI PSU Fund", amfiCode: "147632", proxyIndex: "NIFTY PSU BANK", category: "Sectoral - PSU" },
  { id: 17, name: "Nippon India Metal & Mining Fund", amfiCode: "118825", proxyIndex: "NIFTY METAL", category: "Sectoral - Metal" },
  { id: 18, name: "ICICI Pru Technology Fund", amfiCode: "120590", proxyIndex: "NIFTY IT", category: "Sectoral - IT" },
  { id: 19, name: "Kotak Banking & PSU Debt Fund", amfiCode: "120841", proxyIndex: "NIFTY BANK", category: "Debt - Banking" },
];

export const INDEX_LIST = [
  "NIFTY 50",
  "NIFTY NEXT 50",
  "NIFTY MIDCAP 150",
  "NIFTY SMALLCAP 250",
  "NIFTY BANK",
  "NIFTY IT",
  "NIFTY AUTO",
  "NIFTY PHARMA",
  "NIFTY FMCG",
  "NIFTY METAL",
  "NIFTY REALTY",
  "NIFTY FINANCIAL SERVICES",
  "NIFTY ENERGY",
  "NIFTY PSU BANK",
  "NIFTY INFRA",
  "NIFTY LARGEMIDCAP 250",
  "NIFTY 500",
  "NIFTY MEDIA",
];

// NSE index symbol mapping (for NSE API calls)
export const NSE_INDEX_MAP: Record<string, string> = {
  "NIFTY 50": "NIFTY 50",
  "NIFTY NEXT 50": "NIFTY NEXT 50",
  "NIFTY MIDCAP 150": "NIFTY MIDCAP 150",
  "NIFTY SMALLCAP 250": "NIFTY SMALLCAP 250",
  "NIFTY BANK": "NIFTY BANK",
  "NIFTY IT": "NIFTY IT",
  "NIFTY AUTO": "NIFTY AUTO",
  "NIFTY PHARMA": "NIFTY PHARMA",
  "NIFTY FMCG": "NIFTY FMCG",
  "NIFTY METAL": "NIFTY METAL",
  "NIFTY REALTY": "NIFTY REALTY",
  "NIFTY FINANCIAL SERVICES": "NIFTY FINANCIAL SERVICES",
  "NIFTY ENERGY": "NIFTY ENERGY",
  "NIFTY PSU BANK": "NIFTY PSU BANK",
  "NIFTY INFRA": "NIFTY INFRA",
  "NIFTY LARGEMIDCAP 250": "NIFTY LARGEMIDCAP 250",
  "NIFTY 500": "NIFTY 500",
  "NIFTY MEDIA": "NIFTY MEDIA",
  "GOLD": "GOLD",
};
