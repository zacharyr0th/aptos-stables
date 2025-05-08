'use client';

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { DollarSign, AlertTriangle } from "lucide-react";
import { GeistMono } from 'geist/font/mono';
import { 
  Card, 
  CardContent, 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { MarketShareChart, TOKEN_COLORS } from "@/components/Chart";
import { TokenDialog, TokenMetadata } from "@/components/Dialog";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { RootErrorBoundary } from "@/components/errors/RootErrorBoundary";
import Image from "next/image";

const TOKEN_METADATA: Record<string, TokenMetadata> = {
  'USDt': {
    name: 'Tether USD',
    symbol: 'USDt',
    thumbnail: '/icons/usdt.png',
    type: 'Native Aptos issuance (not bridged)',
    issuer: 'Tether Operations Ltd.',
    assetAddress: '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b::usdt::USDt',
    decimals: 6,
    explorerLink: 'https://explorer.aptoslabs.com/fungible_asset/0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b?network=mainnet',
    website: 'https://tether.to',
    auditLink: 'https://tether.to/en/supported-protocols/?utm_source=chatgpt.com',
    tags: ['collateralized', 'fiat-backed']
  },
  'USDC': {
    name: 'USD Coin',
    symbol: 'USDC',
    thumbnail: '/icons/usdc.png',
    type: 'Native Aptos issuance (Circle CCTP)',
    issuer: 'Circle Internet Financial LLC',
    assetAddress: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
    decimals: 6,
    explorerLink: 'https://explorer.aptoslabs.com/fungible_asset/0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b?network=mainnet',
    website: 'https://www.circle.com/usdc',
    auditLink: 'https://www.circle.com/en/transparency',
    tags: ['collateralized', 'fiat-backed']
  },
  'sUSDe': {
    name: 'Ethena sUSDe',
    symbol: 'sUSDe',
    thumbnail: '/icons/usde.png',
    type: 'Bridged via LayerZero OFT',
    issuer: 'Ethena Labs',
    assetAddress: '0xb30a694a344edee467d9f82330bbe7c3b89f440a1ecd2da1f3bca266560fce69',
    decimals: 6,
    explorerLink: 'https://explorer.aptoslabs.com/fungible_asset/0xb30a694a344edee467d9f82330bbe7c3b89f440a1ecd2da1f3bca266560fce69?network=mainnet',
    website: 'https://ethena.fi',
    auditLink: 'https://www.ethena.fi/transparency',
    tags: ['algorithmic', 'delta-hedged', 'synthetic']
  },
  'USDe': {
    name: 'Ethena USDe',
    symbol: 'USDe',
    thumbnail: '/icons/usde.png',
    type: 'Bridged via LayerZero OFT',
    issuer: 'Ethena Labs',
    assetAddress: '0xf37a8864fe737eb8ec2c2931047047cbaed1beed3fb0e5b7c5526dafd3b9c2e9::usde::USDe',
    decimals: 6,
    explorerLink: 'https://explorer.aptoslabs.com/fungible_asset/0xf37a8864fe737eb8ec2c2931047047cbaed1beed3fb0e5b7c5526dafd3b9c2e9?network=mainnet',
    website: 'https://ethena.fi',
    auditLink: 'https://www.ethena.fi/transparency',
    tags: ['algorithmic', 'delta-hedged', 'synthetic']
  },
  'sUSDe / USDe': {
    name: 'Ethena sUSDe / USDe',
    symbol: 'sUSDe / USDe',
    thumbnail: '/icons/usde.png',
    type: 'Bridged via LayerZero OFT',
    issuer: 'Ethena Labs',
    assetAddress: '0xb30a694a344edee467d9f82330bbe7c3b89f440a1ecd2da1f3bca266560fce69\n0xf37a8864fe737eb8ec2c2931047047cbaed1beed3fb0e5b7c5526dafd3b9c2e9::usde::USDe',
    decimals: 6,
    explorerLink: 'https://explorer.aptoslabs.com/fungible_asset/0xb30a694a344edee467d9f82330bbe7c3b89f440a1ecd2da1f3bca266560fce69?network=mainnet\nhttps://explorer.aptoslabs.com/fungible_asset/0xf37a8864fe737eb8ec2c2931047047cbaed1beed3fb0e5b7c5526dafd3b9c2e9?network=mainnet',
    website: 'https://ethena.fi',
    auditLink: 'https://www.ethena.fi/transparency',
    tags: ['algorithmic', 'delta-hedged', 'synthetic']
  }
};

interface Token {
  symbol: string;
  supply: string;
}

interface CombinedToken {
  symbol: string; // e.g., "USDe / sUSDe"
  supply: string; // Total supply
  isCombined: true;
  components: Token[]; 
}

type DisplayToken = Token | CombinedToken;

interface SupplyData {
  supplies: Token[];
  total: string;
}

// Optimize token card by memoizing expensive calculations and component
const TokenCard = React.memo(function TokenCard({ token, totalSupply }: { token: DisplayToken; totalSupply: string }): React.ReactElement {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { marketSharePercent, formattedDisplaySupply } = useMemo(() => {
    const calcMarketShare = () => {
      if (BigInt(totalSupply) === 0n) return "0";
      return ((BigInt(token.supply) * 100n / BigInt(totalSupply))).toString();
    };

    const formatSingle = (s: string) => {
      const supplyVal = BigInt(s);
      const dollars = Number(supplyVal) / 1_000_000;
      if (dollars >= 1_000_000_000) return `$${(dollars / 1_000_000_000).toFixed(1)}b`;
      if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}m`;
      if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}k`;
      return `$${dollars.toFixed(0)}`;
    };

    const calcFormattedDisplay = () => {
      if ('isCombined' in token && token.isCombined) {
        const susde = token.components.find(c => c.symbol === 'sUSDe');
        const usde = token.components.find(c => c.symbol === 'USDe');
        const parts: string[] = [];
        if (susde) parts.push(formatSingle(susde.supply));
        if (usde) parts.push(formatSingle(usde.supply));
        return parts.join(' / ');
      }
      return formatSingle(token.supply);
    };

    return {
      marketSharePercent: calcMarketShare(),
      formattedDisplaySupply: calcFormattedDisplay()
    };
  }, [token, totalSupply]);

  const cardSymbol = token.symbol;
  const representativeSymbolForColor = ('isCombined' in token && token.isCombined) ? 'USDe' : token.symbol;
  const tokenColor = TOKEN_COLORS[representativeSymbolForColor as keyof typeof TOKEN_COLORS] || TOKEN_COLORS.default;
  const metadata = TOKEN_METADATA[cardSymbol];

  const handleCardClick = useCallback(() => {
    if (metadata) {
      setIsDialogOpen(true);
    }
  }, [metadata]);

  return (
    <>
      <div 
        className="bg-card border rounded-lg overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors"
        onClick={handleCardClick}
      >
        <div className="h-1" style={{ backgroundColor: tokenColor }} />
        <div className="flex justify-between items-center p-2.5 pb-0">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 relative">
              <Image
                src={metadata?.thumbnail || ''}
                alt={`${cardSymbol} icon`}
                width={20}
                height={20}
                className="object-contain"
              />
            </div>
            <h3 className="text-lg font-semibold text-card-foreground">{cardSymbol}</h3>
          </div>
        </div>
        <div className="px-2.5 pt-1.5 pb-0">
          <p className="text-xl font-bold text-card-foreground">{formattedDisplaySupply}</p>
        </div>
        <div className="p-2.5 pt-1.5">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Market Share</span>
            <span className="font-medium text-muted-foreground">
              {marketSharePercent}%
            </span>
          </div>
          <Progress 
            className="h-1"
            value={Number(marketSharePercent)} 
            trackColor={`${tokenColor}20`}
            indicatorColor={tokenColor}
          />
        </div>
      </div>

      {metadata && (
        <TokenDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          metadata={metadata}
          supply={formattedDisplaySupply}
        />
      )}
    </>
  );
});

// Loading state component
function LoadingState(): React.ReactElement {
  return (
    <div className="flex flex-col justify-center items-center h-80">
      <div className="animate-spin h-16 w-16 border-4 border-muted border-t-transparent rounded-full mb-4"></div>
      <p className="text-muted-foreground">Loading latest data...</p>
    </div>
  );
}

// Error state component
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }): React.ReactElement {
  const statusMatch = error.match(/HTTP error! Status: (\d+)/);
  const status = statusMatch ? statusMatch[1] : null;
  const isCustomMessage = !error.startsWith('HTTP error!');
  
  // Extract seconds from error message for countdown
  const secondsMatch = error.match(/Try again in (\d+) seconds/);
  const initialSeconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;
  const [countdown, setCountdown] = useState(initialSeconds);
  
  useEffect(() => {
    // Only start countdown if we have seconds to count down from
    if (initialSeconds <= 0) return;
    
    setCountdown(initialSeconds);
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [initialSeconds, error]);

  return (
    <Card className="border-destructive mb-8">
      <CardContent className="p-6 flex items-center">
        <AlertTriangle className="h-10 w-10 mr-4 flex-shrink-0 text-destructive" />
        <div>
          <h3 className="font-bold text-lg mb-1 text-card-foreground">Error Loading Data</h3>
          {status && <p className="text-muted-foreground text-sm mb-1">HTTP error! Status: {status}</p>}
          
          {isCustomMessage ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                Woah! Please slow down there.
              </span>
              {countdown > 0 && <span className="text-muted-foreground">Try again in</span>}
              <Button 
                onClick={onRetry} 
                variant="outline"
                size="sm"
                className="h-8 px-3"
                disabled={countdown > 0}
              >
                {countdown > 0 ? `${countdown}s` : "Try Again"}
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">
              The request could not be completed.
              <Button 
                onClick={onRetry} 
                variant="outline"
                className="ml-3"
                size="sm"
              >
                Try Again
              </Button>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home(): React.ReactElement {
  const [data, setData] = useState<SupplyData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchSupplyData = useCallback(async (): Promise<void> => {
    try {
      setRefreshing(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch('/api/supply', {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // For 429 rate limit errors, get the custom message
        if (response.status === 429) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSupplyData();
    const interval = setInterval(fetchSupplyData, 300000);
    return () => clearInterval(interval);
  }, [fetchSupplyData]);

  const { formattedTotalSupply, processedSupplies } = useMemo(() => {
    if (!data) return { formattedTotalSupply: '', processedSupplies: [] };

    const formatTotal = () => {
      const supply = BigInt(data.total);
      const dollars = Number(supply) / 1_000_000;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
      }).format(dollars);
    };

    const processSupplies = () => {
      const usdeToken = data.supplies.find(t => t.symbol === 'USDe');
      const susdeToken = data.supplies.find(t => t.symbol === 'sUSDe');
      const otherTokens = data.supplies.filter(t => t.symbol !== 'USDe' && t.symbol !== 'sUSDe');

      const displayTokens: DisplayToken[] = [...otherTokens];
      const ethenaComponents: Token[] = [];
      
      if (usdeToken) ethenaComponents.push(usdeToken);
      if (susdeToken) ethenaComponents.push(susdeToken);

      if (ethenaComponents.length > 0) {
        displayTokens.push({
          symbol: 'sUSDe / USDe',
          isCombined: true,
          supply: ethenaComponents.reduce((acc, curr) => acc + BigInt(curr.supply), 0n).toString(),
          components: ethenaComponents,
        });
      }
      
      return displayTokens.sort((a, b) => {
        const supplyA = BigInt(a.supply);
        const supplyB = BigInt(b.supply);
        return supplyB > supplyA ? 1 : supplyB < supplyA ? -1 : 0;
      });
    };

    return {
      formattedTotalSupply: formatTotal(),
      processedSupplies: processSupplies()
    };
  }, [data]);

  return (
    <RootErrorBoundary>
      <div className={`min-h-screen bg-background dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjUiPgo8cmVjdCB3aWR0aD0iNSIgaGVpZ2h0PSI1IiBmaWxsPSIjMDAwIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDVMNSAwWk02IDRMNCA2Wk0tMSAxTDEgLTFaIiBzdHJva2U9IiMyMjIiIHN0cm9rZS13aWR0aD0iMC41Ij48L3BhdGg+Cjwvc3ZnPg==')] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjUiPgo8cmVjdCB3aWR0aD0iNSIgaGVpZ2h0PSI1IiBmaWxsPSIjZmZmIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDVMNSAwWk02IDRMNCA2Wk0tMSAxTDEgLTFaIiBzdHJva2U9IiNlZWUiIHN0cm9rZS13aWR0aD0iMC41Ij48L3BhdGg+Cjwvc3ZnPg==')] ${GeistMono.className}`}>
        <div className="fixed top-0 left-0 right-0 h-1 z-50">
          {refreshing && <div className="h-full bg-muted animate-pulse"></div>}
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-5">
          <Header />

          <main className="my-2">
            {loading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState error={error} onRetry={fetchSupplyData} />
            ) : data ? (
              <>
                <div className="flex items-center bg-card border rounded-lg py-2 sm:py-3 px-3 sm:px-4 mb-4 sm:mb-6">
                  <div className="flex-grow">
                    <h2 className="text-base sm:text-lg font-medium text-card-foreground">Total Supply</h2>
                    <p className="text-xl sm:text-2xl font-bold text-card-foreground">{formattedTotalSupply}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <div className="md:col-span-1 space-y-4">
                    {processedSupplies.slice(0, 3).map(token => (
                      <TokenCard
                        key={token.symbol}
                        token={token}
                        totalSupply={data.total}
                      />
                    ))}
                  </div>

                  <div className="md:col-span-1 lg:col-span-3 bg-card border rounded-lg overflow-hidden min-h-[250px] sm:min-h-[300px]">
                    <ErrorBoundary fallback={
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center p-4">
                          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
                          <p className="text-sm text-muted-foreground">Failed to load chart</p>
                        </div>
                      </div>
                    }>
                      <MarketShareChart 
                        data={processedSupplies} 
                        totalSupply={data.total} 
                        tokenMetadata={TOKEN_METADATA}
                      />
                    </ErrorBoundary>
                  </div>
                </div>
              </>
            ) : null}
          </main>

          <div className="mt-4">
            <Footer lastUpdated={lastUpdated} />
          </div>
        </div>
      </div>
    </RootErrorBoundary>
  );
} 