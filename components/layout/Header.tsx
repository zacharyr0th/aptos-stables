import React from 'react';
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ErrorBoundary } from '../errors/ErrorBoundary';

interface HeaderProps {
  onRefresh: () => void;
  refreshing: boolean;
}

const HeaderComponent = ({ onRefresh, refreshing }: HeaderProps): React.ReactElement => {
  const handleRefresh = React.useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  return (
    <ErrorBoundary>
      <header className="mb-4 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-1 sm:mb-2">
              Aptos Stablecoins
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Real-time stablecoin supply data from the Aptos blockchain
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="text-sm"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <ThemeToggle />
        </div>
      </header>
    </ErrorBoundary>
  );
};

HeaderComponent.displayName = 'Header';

export const Header = React.memo(HeaderComponent);
