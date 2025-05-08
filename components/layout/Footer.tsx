import React from 'react';
import { Clock } from "lucide-react";
import { FaGlobe, FaXTwitter, FaGithub } from "react-icons/fa6";
import { ErrorBoundary } from '../errors/ErrorBoundary';

interface FooterProps {
  lastUpdated: Date | null;
}

const LastUpdatedTime = React.memo(({ timestamp }: { timestamp: Date }): React.ReactElement => {
  const formattedTime = React.useMemo(() => {
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
});

LastUpdatedTime.displayName = 'LastUpdatedTime';

const FooterComponent = ({ lastUpdated }: FooterProps): React.ReactElement => {
  return (
    <ErrorBoundary>
      <footer className="pt-2 pb-4">
        <div className="flex flex-col lg:flex-row lg:justify-between items-center text-xs sm:text-sm text-muted-foreground gap-3 lg:gap-2">
          {lastUpdated && (
            <div className="flex justify-center lg:justify-start order-first lg:order-last mb-2 lg:mb-0">
              <LastUpdatedTime timestamp={lastUpdated} />
            </div>
          )}
          
          <div className="flex flex-col lg:flex-row items-center gap-3 lg:gap-4">
            <span className="hidden lg:block text-muted-foreground">|</span>

            <p className="text-center lg:text-left mb-2 lg:mb-0 order-first lg:order-none">
              Powered by the <a href="https://aptos.dev/en/build/indexer" target="_blank" rel="noreferrer" className="underline hover:text-accent-foreground transition-colors">Aptos Indexer</a>
            </p>
            
            <div className="flex gap-6 justify-center items-center order-last lg:order-first">
              <a href="https://www.zacharyr0th.com/" target="_blank" rel="noreferrer" className="hover:text-accent-foreground transition-colors">
                <FaGlobe className="w-4 h-4" />
              </a>
              <a href="https://x.com/zacharyr0th" target="_blank" rel="noreferrer" className="hover:text-accent-foreground transition-colors">
                <FaXTwitter className="w-4 h-4" />
              </a>
              <a href="https://github.com/zacharyr0th/aptos-stables" target="_blank" rel="noreferrer" className="hover:text-accent-foreground transition-colors">
                <FaGithub className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </ErrorBoundary>
  );
};

FooterComponent.displayName = 'Footer';

export const Footer = React.memo(FooterComponent);
