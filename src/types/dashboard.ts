export type TrendStatus = "uptrend" | "downtrend" | "sideways";
export type FundTechnicals = {
  sma20:number|null;sma50:number|null;sma100:number|null;sma200:number|null;return1M:number|null;return3M:number|null;return6M:number|null;return1Y:number|null;drawdown52W:number|null;allTimeDrawdown:number|null;momentum10D:number|null;momentum20D:number|null;momentum50D:number|null;latestNav:number|null;navDate:string|null;trendStatus:TrendStatus;
};
export type FundScore = {
  fundId:number;fundName:string;proxyIndex:string;category:string;strategicScore:number;opportunityScore:number;finalScore:number;
  dipOpportunityScore:number;sectorMove:number|null;sectorProxy:string;sectorExposure:"DIRECT"|"THEMATIC"|"BROAD";dipSignal:"HIGH"|"MEDIUM"|"LOW"|"NONE";
  scoreBand:"Strong"|"Good"|"Watch"|"Weak";indexMove:number|null;trendStatus:TrendStatus;actionLabel:"BUY ON DIP"|"SIP"|"WAIT"|"AVOID";
  classification:"Healthy Correction"|"Structural Breakdown"|"Neutral";reason:string;technicals:FundTechnicals;isAvoid:boolean;
};
export type IndexData={name:string;pChange:number;last:number;previousClose:number;yearHigh:number;yearLow:number};
export type MarketRegime={label:"RISK ON"|"RISK OFF"|"NEUTRAL";breadthPercent:number;strategyNote:string;color:"green"|"red"|"yellow"};
export type ScoringWeights={strategicWeight:number;opportunityWeight:number};
export type DashboardPayload={timestamp:string;dataSourceStatus:string;regime:MarketRegime;indices:IndexData[];topFunds:FundScore[];avoidFunds:FundScore[];allFunds:FundScore[];weights:ScoringWeights;computedInMs:number};
