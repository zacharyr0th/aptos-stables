import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
}

const DEFAULT_WIDTH = 1024;

export function useWindowSize(): WindowSize {
  const getWidth = () =>
    typeof window !== 'undefined' ? window.innerWidth : DEFAULT_WIDTH;

  const [width, setWidth] = useState<number>(getWidth);

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWidth(prevWidth => (prevWidth !== newWidth ? newWidth : prevWidth));
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Call once to ensure correct size on mount
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return { width };
}
