import type { StockData } from '../types';

const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';

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
    // Add some random noise to make it feel alive if reloaded
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

// Alpha Vantage Free Tier: 5 calls / minute. 
// We need to be careful.
export async function fetchStockData(symbol: string, apiKey: string): Promise<StockData> {
  if (!apiKey || apiKey === 'DEMO') {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getRandomMockData(symbol.toUpperCase())), 500);
    });
  }

  try {
    const response = await fetch(`${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`);
    const data = await response.json();

    if (data['Note'] || data['Information']) {
       // Rate limit hit or API error, fallback/throw
       throw new Error(data['Note'] || 'API Limit Reached');
    }

    const quote = data['Global Quote'];
    if (!quote || Object.keys(quote).length === 0) {
      throw new Error(`Symbol ${symbol} not found`);
    }

    const price = parseFloat(quote['05. price']);
    const previousClose = parseFloat(quote['08. previous close']);
    const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));

    // Alpha Vantage Global Quote doesn't return Sector. 
    // We would need 'OVERVIEW' endpoint for that, but that consumes more quota.
    // For this simplified app, we might need manual sector input or guess.
    
    return {
      symbol: quote['01. symbol'],
      price,
      changePercent,
      previousClose,
      sector: 'Unknown' // Default
    };
  } catch (error) {
    console.error("Fetch error", error);
    // Fallback to mock if it fails? No, better to alert user.
    throw error;
  }
}
