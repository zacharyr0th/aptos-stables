import React, { useCallback, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  TooltipProps,
} from 'recharts';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useWindowSize } from '@/hooks/useWindowSize';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface Token {
  symbol: string;
  supply: string;
}

export interface CombinedToken {
  symbol: string;
  supply: string;
  isCombined: true;
  components: Token[];
}

export type DisplayToken = Token | CombinedToken;

export interface MarketShareChartProps {
  data: DisplayToken[];
  totalSupply: string;
  tokenMetadata?: Record<string, { assetAddress: string; name?: string }>;
}

interface ChartDataItem {
  name: string;
  value: number;
  formattedSupply: string;
  components?: Token[];
  originalSymbol?: string;
}

export const TOKEN_COLORS: Record<string, string> = {
  USDt: '#90C0A0',
  USDC: '#90B8D9',
  USDe: '#B0B0C0',
  sUSDe: '#C0C0D0',
  'sUSDe/USDe': '#B0B0C0',
  default: '#B8BCC2',
};

const CHART_DIMENSIONS = {
  mobile: { innerRadius: '56%', outerRadius: '98%' },
  desktop: { innerRadius: '63%', outerRadius: '99%' },
};

const BREAKPOINTS = { mobile: 640, desktop: 1024 };

const formatCurrency = (value: bigint): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value) / 1_000_000);

const calculateMarketShare = (supply: bigint, totalSupply: bigint): number =>
  totalSupply === 0n ? 0 : Number((supply * 10000n) / totalSupply) / 100;

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const { name, value, formattedSupply } = payload[0].payload as ChartDataItem;

  return (
    <div className="bg-popover/95 backdrop-blur border rounded-md shadow-lg p-3 z-10 text-sm space-y-1" role="tooltip">
      <p className="font-semibold text-popover-foreground">{name}</p>
      <p className="text-muted-foreground">Market Share: {value.toFixed(2)}%</p>
      <p className="text-muted-foreground">Supply: {formattedSupply}</p>
    </div>
  );
};

// Component for rendering a copyable token name
const TokenNameCopy: React.FC<{ 
  symbol: string; 
  address?: string; 
}> = ({ symbol, address }) => {
  const handleCopy = useCallback((text: string, label: string) => {
    if (!text) return;
    
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} address to clipboard`);
  }, []);

  if (!address) {
    return <span className="text-sm font-medium">{symbol}</span>;
  }

  return (
    <TooltipProvider>
      <UITooltip>
        <TooltipTrigger asChild>
          <span className="relative inline-flex items-center group cursor-pointer">
            <span 
              onClick={() => handleCopy(address, symbol)}
              className="text-sm font-medium group-hover:text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-primary after:scale-x-0 group-hover:after:scale-x-100 hover:after:scale-x-100 after:transition-transform after:origin-left"
            >
              {symbol}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 ml-0.5 p-0 inline-flex align-middle cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(address, symbol);
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy {symbol} Address</p>
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
};

const CustomLegend: React.FC<{ 
  chartData: ChartDataItem[]; 
  tokenMetadata?: Record<string, { assetAddress: string; name?: string }> 
}> = ({ chartData, tokenMetadata }) => {
  if (!chartData.length) return null;

  return (
    <div className="flex flex-col gap-3">
      {chartData.map(({ name, value, originalSymbol, components }, i) => {
        const normalizedName = name.replace(' / ', '/'); // Normalize for colors
        
        return (
          <div key={`legend-${i}`} className="flex items-center gap-3 min-w-[160px]">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: TOKEN_COLORS[normalizedName] || TOKEN_COLORS.default }}
            />
            
            <div className="min-w-[64px] flex flex-wrap text-card-foreground gap-x-1">
              {components && components.length > 1 ? (
                // For combined tokens, show each component completely separately
                <>
                  {components.map((component, idx) => {
                    // Get metadata specifically for this individual token
                    const address = tokenMetadata?.[component.symbol]?.assetAddress;
                    
                    return (
                      <React.Fragment key={component.symbol}>
                        <TokenNameCopy 
                          symbol={component.symbol} 
                          address={address}
                        />
                        {idx < components.length - 1 && (
                          <span className="text-muted-foreground mx-0.5 select-none">/</span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </>
              ) : (
                // For regular tokens
                <TokenNameCopy 
                  symbol={name} 
                  address={tokenMetadata?.[originalSymbol || name]?.assetAddress}
                />
              )}
            </div>
            
            <span className="text-sm text-muted-foreground ml-auto pl-4">
              {value.toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
};

export function MarketShareChart({ 
  data, 
  totalSupply, 
  tokenMetadata = {} 
}: MarketShareChartProps): React.ReactElement {
  const { width } = useWindowSize();
  const total = useMemo(() => BigInt(totalSupply), [totalSupply]);

  const isMobile = width < BREAKPOINTS.mobile;
  const isDesktop = width >= BREAKPOINTS.desktop;

  const chartData = useMemo<ChartDataItem[]>(() => {
    if (total === 0n) return [];

    return data.map((token) => {
      const tokenSupply = BigInt(token.supply);
      const isCombined = 'isCombined' in token;

      // Preserve original symbol for metadata lookup
      const originalSymbol = token.symbol;
      
      // Format display name
      const name =
        isCombined && /^s?USDe\s?\/\s?s?USDe$/i.test(token.symbol)
          ? 'sUSDe/USDe'
          : token.symbol;

      const formattedSupply = isCombined
        ? token.components.map(c => `${c.symbol}: ${formatCurrency(BigInt(c.supply))}`).join('; ')
        : formatCurrency(tokenSupply);

      return {
        name,
        originalSymbol,
        value: calculateMarketShare(tokenSupply, total),
        formattedSupply,
        components: isCombined ? token.components : undefined,
      };
    });
  }, [data, total]);

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="flex items-center">
        <div className="w-64 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={isMobile ? CHART_DIMENSIONS.mobile.innerRadius : CHART_DIMENSIONS.desktop.innerRadius}
                outerRadius={isMobile ? CHART_DIMENSIONS.mobile.outerRadius : CHART_DIMENSIONS.desktop.outerRadius}
                paddingAngle={4}
                dataKey="value"
                startAngle={90}
                endAngle={450}
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={TOKEN_COLORS[entry.name] || TOKEN_COLORS.default}
                    className="stroke-background hover:opacity-90 transition-opacity"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              {!isMobile && <Tooltip content={<CustomTooltip />} cursor={false} />}
            </PieChart>
          </ResponsiveContainer>
        </div>

        {isDesktop && (
          <div className="ml-8">
            <CustomLegend chartData={chartData} tokenMetadata={tokenMetadata} />
          </div>
        )}
      </div>
    </div>
  );
}
