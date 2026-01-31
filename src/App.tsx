import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Plus, Trash2, RefreshCw, Settings } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { fetchStockData } from './services/api';
import type { Stock, PortfolioItem, Summary, SectorAlloc } from './types';
import './App.css';

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function App() {
  const [stocks, setStocks] = useLocalStorage<Stock[]>('portfolio', []);
  const [apiKey, setApiKey] = useLocalStorage<string>('apiKey', '');
  const [baseCurrency, setBaseCurrency] = useLocalStorage<'USD' | 'JPY'>('baseCurrency', 'JPY');
  const [exchangeRate, setExchangeRate] = useLocalStorage<number>('usdJpyRate', 150);

  const [portfolioData, setPortfolioData] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [symbol, setSymbol] = useState('');
  const [qty, setQty] = useState('');
  const [userSector, setUserSector] = useState('');
  const [stockCurrency, setStockCurrency] = useState<'USD' | 'JPY'>('USD');
  const [showSettings, setShowSettings] = useState(false);

  // Fetch Data
  const refreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      const promises = stocks.map(async (stock) => {
        try {
          const marketData = await fetchStockData(stock.symbol, apiKey);
          
          const finalSector = marketData.sector === 'Unknown' && stock.userSector 
            ? stock.userSector 
            : marketData.sector;

          // Native values
          const currentPrice = marketData.price;
          const value = currentPrice * stock.quantity;
          const dayChangeValue = (currentPrice - marketData.previousClose) * stock.quantity;
          const dayChangePercent = marketData.changePercent;

          // Conversion
          const itemCurrency = stock.currency || 'USD';
          let rate = 1;
          
          if (baseCurrency === 'JPY' && itemCurrency === 'USD') {
             rate = exchangeRate;
          } else if (baseCurrency === 'USD' && itemCurrency === 'JPY') {
             rate = 1 / exchangeRate;
          }

          const valueInBaseCurrency = value * rate;
          const dayChangeValueInBaseCurrency = dayChangeValue * rate;

          return {
            ...stock,
            ...marketData,
            sector: finalSector,
            currentPrice,
            value,
            valueInBaseCurrency,
            dayChangeValue,
            dayChangeValueInBaseCurrency,
            dayChangePercent
          } as PortfolioItem;
        } catch (err) {
            console.error(`Failed to load ${stock.symbol}`, err);
            return {
                ...stock,
                currentPrice: 0,
                value: 0,
                valueInBaseCurrency: 0,
                dayChangeValue: 0,
                dayChangeValueInBaseCurrency: 0,
                dayChangePercent: 0,
                sector: stock.userSector || 'Unknown',
                price: 0,
                previousClose: 0,
                changePercent: 0,
                symbol: stock.symbol
            } as PortfolioItem;
        }
      });

      const results = await Promise.all(promises);
      setPortfolioData(results);
    } catch (err) {
      setError('Failed to refresh data. check API key or limits.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stocks.length > 0) {
      refreshData();
    }
  }, [stocks.length, baseCurrency, exchangeRate]); 

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !qty) return;
    const newStock: Stock = {
      id: crypto.randomUUID(),
      symbol: symbol.toUpperCase(),
      quantity: parseFloat(qty),
      userSector: userSector || 'Other',
      currency: stockCurrency
    };
    setStocks([...stocks, newStock]);
    setSymbol('');
    setQty('');
    setUserSector('');
  };

  const removeStock = (id: string) => {
    setStocks(stocks.filter(s => s.id !== id));
    setPortfolioData(portfolioData.filter(s => s.id !== id));
  };

  // Derived Calculations
  const summary: Summary = useMemo(() => {
    return portfolioData.reduce((acc, item) => ({
      totalValue: acc.totalValue + (item.valueInBaseCurrency || 0),
      totalDayChangeValue: acc.totalDayChangeValue + (item.dayChangeValueInBaseCurrency || 0),
      // Aggregate percent change is calculated from totals, not summed
      totalDayChangePercent: 0
    }), { totalValue: 0, totalDayChangeValue: 0, totalDayChangePercent: 0 });
  }, [portfolioData]);

  const totalPreviousValue = summary.totalValue - summary.totalDayChangeValue;
  const portfolioChangePercent = totalPreviousValue !== 0 
    ? (summary.totalDayChangeValue / totalPreviousValue) * 100 
    : 0;

  const sectorData: SectorAlloc[] = useMemo(() => {
    const map = new Map<string, number>();
    portfolioData.forEach(item => {
      const sec = item.sector || 'Unknown';
      const val = item.valueInBaseCurrency || 0;
      map.set(sec, (map.get(sec) || 0) + val);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [portfolioData]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString(undefined, { 
      style: 'currency', 
      currency: baseCurrency 
    });
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Stock Viewer</h1>
        <div className="header-controls">
            <div className="currency-toggle">
                <button 
                    className={baseCurrency === 'USD' ? 'active' : ''} 
                    onClick={() => setBaseCurrency('USD')}
                >USD</button>
                <button 
                    className={baseCurrency === 'JPY' ? 'active' : ''} 
                    onClick={() => setBaseCurrency('JPY')}
                >JPY</button>
            </div>
            <button onClick={() => setShowSettings(!showSettings)} className="icon-btn">
                <Settings size={20} />
            </button>
        </div>
      </header>
      
      {error && <div style={{color: 'red', marginBottom: '1rem'}}>{error}</div>}

      {showSettings && (
        <div className="card settings-card">
           <h3>Settings</h3>
           <label>Alpha Vantage API Key (Use "DEMO" for mock data)</label>
           <input 
             value={apiKey} 
             onChange={(e) => setApiKey(e.target.value)} 
             placeholder="Enter API Key"
             className="input-field"
           />
           <label>USD/JPY Exchange Rate (Manual)</label>
            <input 
             type="number"
             value={exchangeRate} 
             onChange={(e) => setExchangeRate(parseFloat(e.target.value))} 
             className="input-field"
           />
           <p className="hint">
             Note: Free keys allow 5 calls/min.
           </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="card summary-card">
           <div className="label">Total Valuation ({baseCurrency})</div>
           <div className="value large">{formatCurrency(summary.totalValue)}</div>
        </div>
        <div className={`card summary-card ${summary.totalDayChangeValue >= 0 ? 'positive' : 'negative'}`}>
           <div className="label">Day Change</div>
           <div className="value-group">
              <span className="value">
                 {summary.totalDayChangeValue >= 0 ? '+' : ''}
                 {formatCurrency(summary.totalDayChangeValue)}
              </span>
              <span className="percent">
                 ({portfolioChangePercent.toFixed(2)}%)
              </span>
           </div>
        </div>
      </div>

      <div className="main-content">
        {/* Left Column: Form & List */}
        <div className="column">
            <div className="card">
                <h3>Add Holding</h3>
                <form onSubmit={handleAddStock} className="add-form">
                    <div className="form-group">
                        <input 
                            value={symbol} onChange={e => setSymbol(e.target.value)} 
                            placeholder="Symbol (e.g. AAPL)" required className="input-field"
                        />
                        <input 
                            type="number" value={qty} onChange={e => setQty(e.target.value)} 
                            placeholder="Quantity" required className="input-field"
                        />
                         <select 
                            value={stockCurrency} onChange={e => setStockCurrency(e.target.value as any)} 
                            className="input-field" style={{maxWidth: '80px'}}
                        >
                             <option value="USD">USD</option>
                             <option value="JPY">JPY</option>
                        </select>
                        <select 
                            value={userSector} onChange={e => setUserSector(e.target.value)} 
                            className="input-field"
                        >
                             <option value="">Select Sector (Optional)</option>
                             <option value="Technology">Technology</option>
                             <option value="Financial">Financial</option>
                             <option value="Healthcare">Healthcare</option>
                             <option value="Consumer">Consumer</option>
                             <option value="Energy">Energy</option>
                             <option value="Index">Index/ETF</option>
                        </select>
                    </div>
                    <button type="submit" className="btn-primary">
                        <Plus size={16} /> Add
                    </button>
                </form>
            </div>

            <div className="card list-card">
                <div className="list-header">
                    <h3>Holdings</h3>
                    <button onClick={refreshData} disabled={loading} className="icon-btn">
                        <RefreshCw size={18} className={loading ? 'spin' : ''}/>
                    </button>
                </div>
                {portfolioData.length === 0 && <p className="empty-state">No stocks added.</p>}
                <div className="stock-list">
                    {portfolioData.map(stock => (
                        <div key={stock.id} className="stock-item">
                            <div className="stock-info">
                                <span className="stock-symbol">{stock.symbol}</span>
                                <span className="stock-qty">{stock.quantity} shares ({stock.currency || 'USD'})</span>
                                <span className="stock-sector text-muted">{stock.sector}</span>
                            </div>
                            <div className="stock-values">
                                <div className="current-val">
                                     {formatCurrency(stock.valueInBaseCurrency || 0)}
                                </div>
                                <div className={`day-change ${(stock.dayChangeValueInBaseCurrency || 0) >= 0 ? 'green' : 'red'}`}>
                                    {(stock.dayChangePercent || 0).toFixed(2)}%
                                </div>
                            </div>
                            <button onClick={() => removeStock(stock.id)} className="delete-btn">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Right Column: Charts */}
        <div className="column">
            <div className="card chart-card">
                <h3>Sector Allocation ({baseCurrency})</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie
                                data={sectorData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {sectorData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default App;
