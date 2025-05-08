import React from 'react';
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ErrorBoundary } from '../errors/ErrorBoundary';

const HeaderComponent = (): React.ReactElement => {
  return (
    <ErrorBoundary>
      <header className="relative mb-3 sm:mb-5 sm:flex sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2 sm:mb-3">
              Aptos Stablecoins
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Real-time stablecoin supply data from the Aptos blockchain
            </p>
          </div>
        </div>
        
        <div className="absolute top-0 right-0 sm:relative sm:flex sm:items-center gap-3">
          <div className="scale-90 sm:scale-100">
            <ThemeToggle />
          </div>
        </div>
      </header>
    </ErrorBoundary>
  );
};

HeaderComponent.displayName = 'Header';

export const Header = React.memo(HeaderComponent);
