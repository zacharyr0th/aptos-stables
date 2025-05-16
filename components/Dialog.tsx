"use client";

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ErrorBoundary } from './errors/ErrorBoundary';
import { DialogErrorFallback } from './errors/DialogErrorFallback';

interface TokenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: TokenMetadata;
  supply: string;
  susdePrice?: number;
}

interface TokenMetadata {
  name: string;
  symbol: string;
  thumbnail: string;
  type: string;
  issuer: string;
  assetAddress: string;
  decimals: number;
  explorerLink: string;
  website: string;
  auditLink: string;
  tags: string[];
}

interface SupplyApiResponse {
  supplies: Array<{
    symbol: string;
    supply: string;
  }>;
  total: string;
}

const COINMARKETCAP_SUSDE_URL = "https://coinmarketcap.com/currencies/ethena-staked-usde/";

const TokenDialog: React.FC<TokenDialogProps> = ({
  isOpen,
  onClose,
  metadata,
  supply,
  susdePrice
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fullSupplyData, setFullSupplyData] = useState<Record<string, string>>({});
  const [isLoadingSupply, setIsLoadingSupply] = useState(false);

  const symbolParts = useMemo(() => metadata.symbol.split(' / '), [metadata.symbol]);

  // Fetch the full supply data when dialog opens
  useEffect(() => {
    if (isOpen) {
      const fetchSupplyData = async () => {
        setIsLoadingSupply(true);
        try {
          const response = await fetch('/api/supply');
          if (!response.ok) {
            throw new Error('Failed to fetch supply data');
          }
          
          const data: SupplyApiResponse = await response.json();
          const supplyMap: Record<string, string> = {};
          
          // Create a map of symbol to full supply amount
          data.supplies.forEach(item => {
            supplyMap[item.symbol] = item.supply;
          });
          
          setFullSupplyData(supplyMap);
        } catch (error) {
          console.error('Error fetching supply data:', error);
        } finally {
          setIsLoadingSupply(false);
        }
      };
      
      fetchSupplyData();
    }
  }, [isOpen]);

  // Add debug logging for price
  useEffect(() => {
    if (isOpen) {
      console.log('TokenDialog opened with price:', {
        symbol: metadata.symbol,
        susdePrice,
        type: typeof susdePrice
      });
    }
  }, [isOpen, metadata.symbol, susdePrice]);

  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  }, []);

  const handleClose = useCallback(() => onClose(), [onClose]);

  const formattedAddresses = useMemo(() => {
    const addresses = metadata.assetAddress.split('\n');
    return addresses.map((addr, i) => (
      <div key={i} className="flex items-center gap-2 mt-1">
        <div className="flex-grow">
          <div className="text-sm text-muted-foreground mb-1">
            {symbolParts[i] || 'Token'} Address:
          </div>
          <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono break-all">{addr}</code>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => handleCopy(addr, 'address')}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    ));
  }, [metadata.assetAddress, symbolParts, handleCopy]);

  const formattedSupply = useMemo(() => {
    if (isLoadingSupply) {
      return <span className="text-muted-foreground text-sm">Loading...</span>;
    }

    const getTokenIcon = (symbol: string) => {
      const iconMap: Record<string, string> = {
        'USDe': '/icons/usde.png',  // Darker image for USDe
        'sUSDe': '/icons/susde.png', // Lighter image for sUSDe
        'USDC': '/icons/usdc.png',
        'USDt': '/icons/usdt.png'
      };
      
      return iconMap[symbol] || '/icons/aptos.png';
    };

    const formatFullAmount = (symbol: string) => {
      // Get the raw value from API data
      const rawSupply = fullSupplyData[symbol];
      if (!rawSupply) return supply; // Fall back to abbreviated value if not found
      
      // Convert to decimal based on token decimals
      const tokenCount = Number(BigInt(rawSupply)) / Math.pow(10, metadata.decimals);
      
      // Format the token count
      const formattedTokenCount = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0
      }).format(tokenCount);
      
      // For sUSDe, always show token count with @ price as a clickable link
      if (symbol === 'sUSDe') {
        // Only show price if available
        if (typeof susdePrice === 'number' && !isNaN(susdePrice) && susdePrice > 0) {
          return (
            <>
              {formattedTokenCount}
              <a 
                href={COINMARKETCAP_SUSDE_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1"
              >
                <ExternalLink className="h-3 w-3 inline" />
              </a>
            </>
          );
        }
        return formattedTokenCount;
      }
      
      // For USDe, just show the token count
      if (symbol === 'USDe') {
        return formattedTokenCount;
      }
      
      // For USDT and USDC, show formatted number without $ sign
      if (symbol === 'USDt' || symbol === 'USDC') {
        return formattedTokenCount;
      }
      
      // For other tokens, show the USD value
      const formattedDollarValue = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
      }).format(tokenCount);
      
      return formattedDollarValue;
    };
    
    // Handle combined token case (sUSDe / USDe)
    if (symbolParts.length > 1) {
      return (
        <div className="space-y-1">
          {symbolParts.map((symbol, i) => {
            const trimmedSymbol = symbol.trim();
            const iconSrc = getTokenIcon(trimmedSymbol);
            
            return (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 relative">
                    <Image
                      src={iconSrc}
                      alt={trimmedSymbol}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span>{trimmedSymbol}: {formatFullAmount(trimmedSymbol)}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    
    // Handle single token case
    const iconSrc = getTokenIcon(metadata.symbol);
    
    return (
      <div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 relative">
            <Image
              src={iconSrc}
              alt={metadata.symbol}
              fill
              className="object-contain"
            />
          </div>
          <span>{formatFullAmount(metadata.symbol)}</span>
        </div>
      </div>
    );
  }, [supply, fullSupplyData, isLoadingSupply, symbolParts, metadata, susdePrice]);

  const formattedExplorerLinks = useMemo(() => {
    const links = metadata.explorerLink.split('\n');
    return links.map((link, i) => (
      <a
        key={i}
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-sm hover:underline text-primary"
      >
        Aptos Explorer{symbolParts[i] ? ` (${symbolParts[i]})` : ''} <ExternalLink className="h-3 w-3" />
      </a>
    ));
  }, [metadata.explorerLink, symbolParts]);

  const issuerName = useMemo(() => {
    const issuer = metadata.issuer;
    if (issuer.startsWith('Tether')) return 'Tether';
    if (issuer.startsWith('Circle')) return 'Circle';
    if (issuer.startsWith('Ethena')) return 'Ethena';
    return issuer.split(' ')[0];
  }, [metadata.issuer]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-card">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12">
              {!imageLoaded && <div className="absolute inset-0 bg-muted animate-pulse rounded-full" />}
              <Image
                src={metadata.thumbnail}
                alt={metadata.name}
                fill
                className={`rounded-full object-contain ${!imageLoaded ? 'opacity-0' : ''}`}
                onLoad={() => setImageLoaded(true)}
              />
            </div>
            <div>
              <DialogTitle className="text-xl">{metadata.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{metadata.symbol}</p>
            </div>
          </div>
        </DialogHeader>

        <ErrorBoundary fallback={<DialogErrorFallback onCloseDialog={handleClose} />}>
          <div className="space-y-4">
            <InfoRow label="Type:" value={metadata.type} />
            <InfoRow label="Asset Address:" value={formattedAddresses} />
            <InfoRow label="Issuer:" value={metadata.issuer} />
            <InfoRow label="Decimals:" value={metadata.decimals} />
            <InfoRow label="Total Supply:" value={formattedSupply} />

            <Separator />

            <InfoRow
              label="Links:"
              value={
                <div className="space-y-2">
                  {formattedExplorerLinks}
                  <a
                    href={metadata.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm hover:underline text-primary"
                  >
                    {issuerName}&apos;s Website <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href={metadata.auditLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm hover:underline text-primary"
                  >
                    Audit / Proof of Reserves <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              }
            />

            <InfoRow
              label="Tags:"
              value={
                <div className="flex flex-wrap gap-2">
                  {metadata.tags.map(tag => (
                    <span
                      key={tag}
                      className="bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              }
            />
          </div>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
};

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex gap-4 items-start">
    <span className="text-sm text-muted-foreground w-[120px] flex-shrink-0">{label}</span>
    <div className="flex-1">{value}</div>
  </div>
);

export const MemoizedTokenDialog = React.memo(TokenDialog);
export { MemoizedTokenDialog as TokenDialog };
export type { TokenMetadata };
