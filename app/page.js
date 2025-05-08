'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { DollarSign, Clock, RefreshCw, AlertTriangle } from "lucide-react";
import { GeistMono } from 'geist/font/mono';

// Extracted component for timestamp display
function LastUpdatedTime({ timestamp }) {
  const formattedTime = useMemo(() => {
    if (!timestamp) return '';
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(timestamp);
  }, [timestamp]);
  
  return (
    <div className="flex items-center">
      <Clock className="h-4 w-4 mr-1" />
      <span>{formattedTime}</span>
    </div>
  );
}

// Extracted token card component to reduce main render logic
function TokenCard({ token, totalSupply }) {
  const marketSharePercent = useMemo(() => {
    return ((BigInt(token.supply) * 100n / BigInt(totalSupply))).toString();
  }, [token.supply, totalSupply]);

  const formattedSupply = useMemo(() => {
    const supply = BigInt(token.supply);
    const dollars = Number(supply) / 1_000_000;
    
    if (dollars >= 1_000_000_000) {
      return `$${(dollars / 1_000_000_000).toFixed(2)}b`;
    } else if (dollars >= 1_000_000) {
      return `$${(dollars / 1_000_000).toFixed(2)}m`;
    } else if (dollars >= 1_000) {
      return `$${(dollars / 1_000).toFixed(2)}k`;
    } else {
      return `$${dollars.toFixed(2)}`;
    }
  }, [token.supply]);

  const tokenColor = useMemo(() => {
    const colors = {
      'USDt': 'from-zinc-700 to-zinc-800',
      'USDC': 'from-zinc-800 to-zinc-900',
      'USDe': 'from-zinc-600 to-zinc-700',
      'default': 'from-zinc-700 to-zinc-800'
    };
    return colors[token.symbol] || colors.default;
  }, [token.symbol]);

  const tokenAccentColor = useMemo(() => {
    const colors = {
      'USDt': 'bg-zinc-700 text-zinc-200',
      'USDC': 'bg-zinc-800 text-zinc-200',
      'USDe': 'bg-zinc-600 text-zinc-200',
      'default': 'bg-zinc-700 text-zinc-200'
    };
    return colors[token.symbol] || colors.default;
  }, [token.symbol]);

  return (
    <div className="bg-zinc-900/70 rounded-xl shadow-lg overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all duration-300 backdrop-filter backdrop-blur-sm">
      <div className={`h-2 bg-gradient-to-r ${tokenColor}`}></div>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-zinc-300">{token.symbol}</h3>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${tokenAccentColor}`}>
            {token.symbol}
          </span>
        </div>
        <p className="text-3xl font-bold text-zinc-200 mb-2 break-all">{formattedSupply}</p>
        
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-zinc-500">Market Share</span>
            <span className="font-medium text-zinc-400">
              {marketSharePercent}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-1.5 bg-gradient-to-r ${tokenColor} rounded-full`} 
              style={{ width: `${marketSharePercent}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading state component
function LoadingState() {
  return (
    <div className="flex flex-col justify-center items-center h-80">
      <div className="animate-spin h-16 w-16 border-4 border-zinc-700 border-t-transparent rounded-full mb-4"></div>
      <p className="text-zinc-400">Loading latest data...</p>
    </div>
  );
}

// Error state component
function ErrorState({ error, onRetry }) {
  return (
    <div className="bg-zinc-900/80 border border-zinc-800 text-zinc-400 p-6 rounded-xl mb-8 flex items-center">
      <AlertTriangle className="h-10 w-10 mr-4 flex-shrink-0 text-zinc-500" />
      <div>
        <h3 className="font-bold text-lg mb-1 text-zinc-300">Error Loading Data</h3>
        <p>{error}</p>
        <button 
          onClick={onRetry} 
          className="mt-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg transition-colors border border-zinc-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSupplyData = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/supply');
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSupplyData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchSupplyData, 300000);
    return () => clearInterval(interval);
  }, [fetchSupplyData]);

  const formattedTotalSupply = useMemo(() => {
    if (!data) return '';
    
    const supply = BigInt(data.total);
    const dollars = Number(supply) / 1_000_000;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(dollars);
  }, [data]);

  const sortedSupplies = useMemo(() => {
    if (!data) return [];
    
    return [...data.supplies].sort((a, b) => 
      BigInt(b.supply) > BigInt(a.supply) ? 1 : -1
    );
  }, [data]);

  return (
    <div className={`min-h-screen bg-black bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjUiPgo8cmVjdCB3aWR0aD0iNSIgaGVpZ2h0PSI1IiBmaWxsPSIjMDAwIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDVMNSAwWk02IDRMNCA2Wk0tMSAxTDEgLTFaIiBzdHJva2U9IiMyMjIiIHN0cm9rZS13aWR0aD0iMC41Ij48L3BhdGg+Cjwvc3ZnPg==')] ${GeistMono.className}`}>
      <div className="fixed top-0 left-0 right-0 h-1 z-50">
        {refreshing && <div className="h-full bg-zinc-500 animate-pulse"></div>}
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold mb-2">
              <span className="text-zinc-200">Aptos</span> <span className="text-zinc-400">Stablecoin</span> <span className="text-zinc-200">Supply</span> <span className="text-zinc-200">Dashboard</span>
            </h1>
            <p className="text-zinc-400 text-lg">
              Real-time stablecoin supply data from the Aptos blockchain
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center">
            <button 
              onClick={fetchSupplyData}
              disabled={refreshing}
              className="flex items-center bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg transition-colors border border-zinc-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </header>

        <main>
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={fetchSupplyData} />
          ) : (
            <>
              {/* Total Supply */}
              <div className="bg-zinc-900/70 rounded-xl shadow-lg p-6 border border-zinc-800 mb-8 backdrop-filter backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-zinc-300">Total Supply</h2>
                  <div className="p-2 rounded-lg bg-zinc-800">
                    <DollarSign className="h-5 w-5 text-zinc-400" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-zinc-200">{formattedTotalSupply}</p>
              </div>

              {/* Token Cards */}
              <h2 className="text-2xl font-bold text-zinc-300 mb-4">Stablecoin Breakdown</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedSupplies.map(token => (
                  <TokenCard 
                    key={token.symbol} 
                    token={token} 
                    totalSupply={data.total} 
                  />
                ))}
              </div>
            </>
          )}
        </main>

        <footer className="mt-12 border-t border-zinc-800 pt-6 pb-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-zinc-500">
            <p className="mb-2 md:mb-0">
              Powered by the <a href="https://aptos.dev/en/build/indexer" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-400 transition-colors">Aptos Indexer</a>.
            </p>
            {lastUpdated && <LastUpdatedTime timestamp={lastUpdated} />}
          </div>
        </footer>
      </div>
    </div>
  );
}
