import type { StockData } from '../types';

const API_BASE = '/api/quote'; 

// Mock Data for Demo Mode
const MOCK_DB: Record<string, StockData> = {
  'AAPL': { symbol: 'AAPL', price: 230.50, changePercent: 1.25, previousClose: 227.65, sector: 'Technology' },
  'MSFT': { symbol: 'MSFT', price: 410.20, changePercent: -0.5, previousClose: 412.26, sector: 'Technology' },
  'GOOGL': { symbol: 'GOOGL', price: 175.00, changePercent: 0.8, previousClose: 173.61, sector: 'Technology' },
  'AMZN': { symbol: 'AMZN', price: 185.30, changePercent: 2.1, previousClose: 181.49, sector: 'Consumer Cyclical' },
  'TSLA': { symbol: 'TSLA', price: 240.00, changePercent: -3.5, previousClose: 248.70, sector: 'Consumer Cyclical' },
  'NVDA': { symbol: 'NVDA', price: 120.50, changePercent: 4.0, previousClose: 115.87, sector: 'Technology' },
  'JPM': { symbol: 'JPM', price: 205.10, changePercent: 0.2, previousClose: 204.69, sector: 'Financial' },
  'V': { symbol: 'V', price: 290.00, changePercent: -0.1, previousClose: 290.29, sector: 'Financial' },
  'JNJ': { symbol: 'JNJ', price: 155.00, changePercent: 0.5, previousClose: 154.23, sector: 'Healthcare' },
  'SPY': { symbol: 'SPY', price: 560.00, changePercent: 0.9, previousClose: 555.00, sector: 'Index' },
};

function getRandomMockData(symbol: string): StockData {
  if (MOCK_DB[symbol]) {
    const noise = (Math.random() - 0.5) * 2;
    const base = MOCK_DB[symbol];
    return {
      ...base,
      price: base.price + noise,
      changePercent: base.changePercent + (noise / 10),
    };
  }
  return {
    symbol,
    price: 100 + Math.random() * 50,
    changePercent: (Math.random() - 0.5) * 5,
    previousClose: 100,
    sector: 'Unknown',
  };
}

// Now calls our own Backend
export async function fetchStockData(symbol: string, apiKey?: string): Promise<StockData> {
  // If explicitly "DEMO", usage Mock. 
  // In frontend UI, user can still type "DEMO" to force mock mode.
  if (apiKey === 'DEMO') {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getRandomMockData(symbol.toUpperCase())), 500);
    });
  }

  try {
    // Call our server proxy
    const response = await fetch(`${API_BASE}?symbol=${symbol}`);
    
    if (!response.ok) {
       const errJson = await response.json().catch(() => ({}));
       console.warn("Backend Error:", errJson);
       throw new Error(errJson.error || 'Server Error');
    }

    const data = await response.json();
    return {
      symbol: data.symbol,
      price: data.price,
      changePercent: data.changePercent,
      previousClose: data.previousClose,
      sector: 'Unknown' 
    };
  } catch (error) {
    console.warn("Backend fetch failed, falling back to Mock/Demo data logic.", error);
    // Fallback: If backend is down or 404 (GitHub Pages), use Mock
    return getRandomMockData(symbol.toUpperCase());
  }
}
