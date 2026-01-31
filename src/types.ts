export interface Stock {
  id: string; // Internal ID for the list
  symbol: string;
  quantity: number;
  purchasePrice?: number; // Optional, for calculating simple P/L if needed (though user asked for total value)
  userSector?: string; // User defined sector if API fails or override
  currency?: 'USD' | 'JPY'; // currency of the asset
}

export interface StockData {
  symbol: string;
  price: number;
  changePercent: number; // Daily change percentage
  previousClose: number;
  sector?: string;
  currency?: string; 
  isMock?: boolean;
}

export interface PortfolioItem extends Stock {
  currentPrice?: number;
  value?: number; // quantity * currentPrice (in native currency)
  valueInBaseCurrency?: number; // Converted value
  dayChangeValue?: number; 
  dayChangeValueInBaseCurrency?: number;
  dayChangePercent?: number; 
  sector?: string;
  previousClose?: number;
  isMock?: boolean;
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
