import React from 'react';
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ErrorBoundary } from '../errors/ErrorBoundary';

const HeaderComponent = (): React.ReactElement => {
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
          <ThemeToggle />
        </div>
      </header>
    </ErrorBoundary>
  );
};

HeaderComponent.displayName = 'Header';

export const Header = React.memo(HeaderComponent);
