"use client";

import React, { useCallback, useMemo, useState } from 'react';
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

const TokenDialog: React.FC<TokenDialogProps> = ({
  isOpen,
  onClose,
  metadata,
  supply
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const symbolParts = useMemo(() => metadata.symbol.split(' / '), [metadata.symbol]);

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
    const parts = supply.split(' / ');
    return parts.length > 1 ? (
      <div className="space-y-1">
        {parts.map((amount, i) => (
          <div key={i} className="flex items-center gap-2">
            <span>{symbolParts[i]}: {amount}</span>
          </div>
        ))}
      </div>
    ) : (
      <span>{supply}</span>
    );
  }, [supply, symbolParts]);

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
    <span className="text-sm text-muted-foreground w-[120px]">{label}</span>
    <div>{value}</div>
  </div>
);

export const MemoizedTokenDialog = React.memo(TokenDialog);
export { MemoizedTokenDialog as TokenDialog };
export type { TokenMetadata };
