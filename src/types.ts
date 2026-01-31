export interface Stock {
  id: string; // Internal ID for the list
  symbol: string;
  quantity: number;
  purchasePrice?: number; // Optional, for calculating simple P/L if needed (though user asked for total value)
  userSector?: string; // User defined sector if API fails or override
}

export interface StockData {
  symbol: string;
  price: number;
  changePercent: number; // Daily change percentage
  previousClose: number;
  sector?: string;
}

export interface PortfolioItem extends Stock {
  currentPrice?: number;
  value?: number; // quantity * currentPrice
  dayChangeValue?: number; // (currentPrice - previousClose) * quantity
  dayChangePercent?: number; 
  sector?: string;
  previousClose?: number;
}

export interface Summary {
  totalValue: number;
  totalDayChangeValue: number;
  totalDayChangePercent: number;
}

export interface SectorAlloc {
  name: string;
  value: number;
}
