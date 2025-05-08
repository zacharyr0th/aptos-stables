import { useWindowSize } from './useWindowSize';

/**
 * Hook to determine if the current viewport is mobile-sized
 * @param breakpoint The width threshold below which is considered mobile (default: 768)
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const { width } = useWindowSize();
  return width < breakpoint;
} 